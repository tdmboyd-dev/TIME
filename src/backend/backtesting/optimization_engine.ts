/**
 * TIME — Optimization Engine
 *
 * Features:
 * - Grid search optimization
 * - Genetic algorithm optimization
 * - Bayesian optimization
 * - Multi-objective optimization (Pareto frontier)
 * - Parameter sensitivity analysis
 */

import {
  BacktestConfig,
  BacktestingEngine,
  BacktestResult,
  Candle,
} from '../strategies/backtesting_engine';

// ==========================================
// TYPES
// ==========================================

export interface ParameterSpace {
  name: string;
  min: number;
  max: number;
  step?: number;
  values?: number[]; // Discrete values
}

export interface OptimizationConfig {
  objective: 'return' | 'sharpe' | 'calmar' | 'profit_factor' | 'multi_objective';
  constraints?: {
    minTrades?: number;
    maxDrawdown?: number;
    minWinRate?: number;
  };
  multiObjectiveWeights?: {
    return: number;
    sharpe: number;
    drawdown: number;
    winRate: number;
  };
}

export interface OptimizationResult {
  parameters: Record<string, number>;
  metrics: {
    returnPercent: number;
    sharpeRatio: number;
    calmarRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    totalTrades: number;
  };
  objectiveValue: number;
  rank?: number;
}

export interface GeneticAlgorithmConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  elitismRate: number;
}

export interface BayesianOptimizationConfig {
  nInitialPoints: number;
  nIterations: number;
  acquisitionFunction: 'ei' | 'ucb' | 'poi'; // Expected Improvement, Upper Confidence Bound, Probability of Improvement
  explorationExploitation: number; // Balance between exploration and exploitation (0-1)
}

export interface SensitivityAnalysisResult {
  parameter: string;
  baseValue: number;
  variations: {
    value: number;
    returnPercent: number;
    sharpeRatio: number;
    maxDrawdown: number;
  }[];
  sensitivity: number; // How much return changes per unit change in parameter
  robustness: number; // Inverse of sensitivity (higher = more robust)
}

// ==========================================
// GRID SEARCH OPTIMIZER
// ==========================================

export class GridSearchOptimizer {
  private config: OptimizationConfig;

  constructor(config: OptimizationConfig) {
    this.config = config;
  }

  /**
   * Run grid search optimization
   */
  public async optimize(
    candles: Candle[],
    baseConfig: BacktestConfig,
    parameterSpace: ParameterSpace[]
  ): Promise<{
    bestResult: OptimizationResult;
    allResults: OptimizationResult[];
    paretoFrontier?: OptimizationResult[];
  }> {
    const allResults: OptimizationResult[] = [];

    // Generate all parameter combinations
    const combinations = this.generateCombinations(parameterSpace);

    console.log(`Grid search: testing ${combinations.length} parameter combinations...`);

    for (let i = 0; i < combinations.length; i++) {
      const params = combinations[i];

      // Update config with new parameters
      const testConfig: BacktestConfig = {
        ...baseConfig,
        ...this.mapParametersToConfig(params),
      };

      try {
        // Run backtest
        const engine = new BacktestingEngine(testConfig);
        const result = engine.runBacktest(candles);

        // Check constraints
        if (!this.meetsConstraints(result)) {
          continue;
        }

        // Calculate objective value
        const objectiveValue = this.calculateObjective(result);

        allResults.push({
          parameters: params,
          metrics: {
            returnPercent: result.totalReturnPercent,
            sharpeRatio: result.sharpeRatio,
            calmarRatio: result.calmarRatio,
            maxDrawdown: result.maxDrawdownPercent,
            winRate: result.winRate,
            profitFactor: result.profitFactor,
            totalTrades: result.totalTrades,
          },
          objectiveValue,
        });
      } catch (error) {
        console.error(`Error testing parameters:`, params, error);
      }
    }

    // Sort by objective value
    allResults.sort((a, b) => b.objectiveValue - a.objectiveValue);

    // Assign ranks
    allResults.forEach((result, index) => {
      result.rank = index + 1;
    });

    const bestResult = allResults[0];

    // Calculate Pareto frontier for multi-objective
    const paretoFrontier = this.config.objective === 'multi_objective'
      ? this.calculateParetoFrontier(allResults)
      : undefined;

    return {
      bestResult,
      allResults,
      paretoFrontier,
    };
  }

  /**
   * Generate all parameter combinations
   */
  private generateCombinations(parameterSpace: ParameterSpace[]): Record<string, number>[] {
    if (parameterSpace.length === 0) return [{}];

    const first = parameterSpace[0];
    const rest = parameterSpace.slice(1);

    const values = first.values || this.generateRange(first.min, first.max, first.step || 1);
    const restCombinations = this.generateCombinations(rest);

    const combinations: Record<string, number>[] = [];

    for (const value of values) {
      for (const restCombo of restCombinations) {
        combinations.push({
          [first.name]: value,
          ...restCombo,
        });
      }
    }

    return combinations;
  }

  private generateRange(min: number, max: number, step: number): number[] {
    const values: number[] = [];
    for (let v = min; v <= max; v += step) {
      values.push(v);
    }
    return values;
  }

  private meetsConstraints(result: BacktestResult): boolean {
    const c = this.config.constraints;
    if (!c) return true;

    if (c.minTrades && result.totalTrades < c.minTrades) return false;
    if (c.maxDrawdown && result.maxDrawdownPercent > c.maxDrawdown) return false;
    if (c.minWinRate && result.winRate < c.minWinRate) return false;

    return true;
  }

  private calculateObjective(result: BacktestResult): number {
    switch (this.config.objective) {
      case 'return':
        return result.totalReturnPercent;
      case 'sharpe':
        return result.sharpeRatio;
      case 'calmar':
        return result.calmarRatio;
      case 'profit_factor':
        return result.profitFactor;
      case 'multi_objective':
        const w = this.config.multiObjectiveWeights || {
          return: 0.4,
          sharpe: 0.3,
          drawdown: 0.2,
          winRate: 0.1,
        };
        return (
          w.return * (result.totalReturnPercent / 100) +
          w.sharpe * (result.sharpeRatio / 3) +
          w.drawdown * (1 - result.maxDrawdownPercent / 100) +
          w.winRate * result.winRate
        );
      default:
        return result.totalReturnPercent;
    }
  }

  private calculateParetoFrontier(results: OptimizationResult[]): OptimizationResult[] {
    const frontier: OptimizationResult[] = [];

    for (const candidate of results) {
      let isDominated = false;

      for (const other of results) {
        if (candidate === other) continue;

        // Check if 'other' dominates 'candidate'
        const otherBetter = (
          other.metrics.returnPercent >= candidate.metrics.returnPercent &&
          other.metrics.sharpeRatio >= candidate.metrics.sharpeRatio &&
          other.metrics.maxDrawdown <= candidate.metrics.maxDrawdown
        );

        const otherStrictlyBetter = (
          other.metrics.returnPercent > candidate.metrics.returnPercent ||
          other.metrics.sharpeRatio > candidate.metrics.sharpeRatio ||
          other.metrics.maxDrawdown < candidate.metrics.maxDrawdown
        );

        if (otherBetter && otherStrictlyBetter) {
          isDominated = true;
          break;
        }
      }

      if (!isDominated) {
        frontier.push(candidate);
      }
    }

    return frontier;
  }

  private mapParametersToConfig(params: Record<string, number>): Partial<BacktestConfig> {
    const config: Partial<BacktestConfig> = {};

    if (params.positionSizePercent) config.positionSizePercent = params.positionSizePercent;
    if (params.maxDrawdownPercent) config.maxDrawdownPercent = params.maxDrawdownPercent;
    if (params.commissionPercent) config.commissionPercent = params.commissionPercent;
    if (params.slippagePercent) config.slippagePercent = params.slippagePercent;
    if (params.leverage) config.leverage = params.leverage;

    return config;
  }
}

// ==========================================
// GENETIC ALGORITHM OPTIMIZER
// ==========================================

export class GeneticAlgorithmOptimizer {
  private config: GeneticAlgorithmConfig;
  private optimizationConfig: OptimizationConfig;

  constructor(config: GeneticAlgorithmConfig, optimizationConfig: OptimizationConfig) {
    this.config = config;
    this.optimizationConfig = optimizationConfig;
  }

  /**
   * Run genetic algorithm optimization
   */
  public async optimize(
    candles: Candle[],
    baseConfig: BacktestConfig,
    parameterSpace: ParameterSpace[]
  ): Promise<{
    bestResult: OptimizationResult;
    generationHistory: { generation: number; bestFitness: number; avgFitness: number }[];
  }> {
    // Initialize population
    let population = this.initializePopulation(parameterSpace);
    const generationHistory: { generation: number; bestFitness: number; avgFitness: number }[] = [];

    for (let gen = 0; gen < this.config.generations; gen++) {
      // Evaluate fitness
      const fitnessScores = await Promise.all(
        population.map(individual => this.evaluateFitness(individual, candles, baseConfig))
      );

      // Track best and average fitness
      const validScores = fitnessScores.filter(s => s !== null) as number[];
      const bestFitness = Math.max(...validScores);
      const avgFitness = validScores.reduce((a, b) => a + b, 0) / validScores.length;

      generationHistory.push({
        generation: gen + 1,
        bestFitness,
        avgFitness,
      });

      console.log(`Generation ${gen + 1}/${this.config.generations}: Best=${bestFitness.toFixed(4)}, Avg=${avgFitness.toFixed(4)}`);

      // Selection
      const selected = this.selection(population, fitnessScores);

      // Crossover
      const offspring = this.crossover(selected, parameterSpace);

      // Mutation
      const mutated = this.mutation(offspring, parameterSpace);

      // Elitism - keep best individuals
      const eliteCount = Math.floor(this.config.populationSize * this.config.elitismRate);
      const elite = population
        .map((individual, index) => ({ individual, fitness: fitnessScores[index] || -Infinity }))
        .sort((a, b) => b.fitness - a.fitness)
        .slice(0, eliteCount)
        .map(e => e.individual);

      // Next generation
      population = [...elite, ...mutated.slice(0, this.config.populationSize - eliteCount)];
    }

    // Final evaluation to get best result
    const finalFitness = await Promise.all(
      population.map(individual => this.evaluateFitness(individual, candles, baseConfig))
    );

    const bestIdx = finalFitness.indexOf(Math.max(...finalFitness.filter(f => f !== null) as number[]));
    const bestIndividual = population[bestIdx];

    // Run final backtest for best individual
    const testConfig = { ...baseConfig, ...this.mapParametersToConfig(bestIndividual, parameterSpace) };
    const engine = new BacktestingEngine(testConfig);
    const result = engine.runBacktest(candles);

    const bestResult: OptimizationResult = {
      parameters: bestIndividual,
      metrics: {
        returnPercent: result.totalReturnPercent,
        sharpeRatio: result.sharpeRatio,
        calmarRatio: result.calmarRatio,
        maxDrawdown: result.maxDrawdownPercent,
        winRate: result.winRate,
        profitFactor: result.profitFactor,
        totalTrades: result.totalTrades,
      },
      objectiveValue: finalFitness[bestIdx] || 0,
    };

    return {
      bestResult,
      generationHistory,
    };
  }

  private initializePopulation(parameterSpace: ParameterSpace[]): Record<string, number>[] {
    const population: Record<string, number>[] = [];

    for (let i = 0; i < this.config.populationSize; i++) {
      const individual: Record<string, number> = {};

      for (const param of parameterSpace) {
        if (param.values) {
          individual[param.name] = param.values[Math.floor(Math.random() * param.values.length)];
        } else {
          individual[param.name] = param.min + Math.random() * (param.max - param.min);
        }
      }

      population.push(individual);
    }

    return population;
  }

  private async evaluateFitness(
    individual: Record<string, number>,
    candles: Candle[],
    baseConfig: BacktestConfig
  ): Promise<number | null> {
    try {
      const testConfig = { ...baseConfig, ...this.mapParametersToConfig(individual, []) };
      const engine = new BacktestingEngine(testConfig);
      const result = engine.runBacktest(candles);

      // Check constraints
      if (!this.meetsConstraints(result)) {
        return null;
      }

      return this.calculateObjective(result);
    } catch (error) {
      return null;
    }
  }

  private selection(population: Record<string, number>[], fitnessScores: (number | null)[]): Record<string, number>[] {
    // Tournament selection
    const selected: Record<string, number>[] = [];
    const tournamentSize = 3;

    while (selected.length < this.config.populationSize) {
      const tournament: { individual: Record<string, number>; fitness: number }[] = [];

      for (let i = 0; i < tournamentSize; i++) {
        const idx = Math.floor(Math.random() * population.length);
        tournament.push({
          individual: population[idx],
          fitness: fitnessScores[idx] || -Infinity,
        });
      }

      tournament.sort((a, b) => b.fitness - a.fitness);
      selected.push({ ...tournament[0].individual });
    }

    return selected;
  }

  private crossover(
    population: Record<string, number>[],
    parameterSpace: ParameterSpace[]
  ): Record<string, number>[] {
    const offspring: Record<string, number>[] = [];

    for (let i = 0; i < population.length; i += 2) {
      const parent1 = population[i];
      const parent2 = population[i + 1] || population[0];

      if (Math.random() < this.config.crossoverRate) {
        // Uniform crossover
        const child1: Record<string, number> = {};
        const child2: Record<string, number> = {};

        for (const param of parameterSpace) {
          if (Math.random() < 0.5) {
            child1[param.name] = parent1[param.name];
            child2[param.name] = parent2[param.name];
          } else {
            child1[param.name] = parent2[param.name];
            child2[param.name] = parent1[param.name];
          }
        }

        offspring.push(child1, child2);
      } else {
        offspring.push({ ...parent1 }, { ...parent2 });
      }
    }

    return offspring;
  }

  private mutation(
    population: Record<string, number>[],
    parameterSpace: ParameterSpace[]
  ): Record<string, number>[] {
    return population.map(individual => {
      const mutated = { ...individual };

      for (const param of parameterSpace) {
        if (Math.random() < this.config.mutationRate) {
          if (param.values) {
            mutated[param.name] = param.values[Math.floor(Math.random() * param.values.length)];
          } else {
            // Gaussian mutation
            const range = param.max - param.min;
            const mutation = (Math.random() - 0.5) * range * 0.1; // 10% of range
            mutated[param.name] = Math.max(param.min, Math.min(param.max, mutated[param.name] + mutation));
          }
        }
      }

      return mutated;
    });
  }

  private meetsConstraints(result: BacktestResult): boolean {
    const c = this.optimizationConfig.constraints;
    if (!c) return true;

    if (c.minTrades && result.totalTrades < c.minTrades) return false;
    if (c.maxDrawdown && result.maxDrawdownPercent > c.maxDrawdown) return false;
    if (c.minWinRate && result.winRate < c.minWinRate) return false;

    return true;
  }

  private calculateObjective(result: BacktestResult): number {
    switch (this.optimizationConfig.objective) {
      case 'return':
        return result.totalReturnPercent;
      case 'sharpe':
        return result.sharpeRatio;
      case 'calmar':
        return result.calmarRatio;
      case 'profit_factor':
        return result.profitFactor;
      case 'multi_objective':
        const w = this.optimizationConfig.multiObjectiveWeights || {
          return: 0.4,
          sharpe: 0.3,
          drawdown: 0.2,
          winRate: 0.1,
        };
        return (
          w.return * (result.totalReturnPercent / 100) +
          w.sharpe * (result.sharpeRatio / 3) +
          w.drawdown * (1 - result.maxDrawdownPercent / 100) +
          w.winRate * result.winRate
        );
      default:
        return result.totalReturnPercent;
    }
  }

  private mapParametersToConfig(
    params: Record<string, number>,
    parameterSpace: ParameterSpace[]
  ): Partial<BacktestConfig> {
    const config: Partial<BacktestConfig> = {};

    if (params.positionSizePercent) config.positionSizePercent = params.positionSizePercent;
    if (params.maxDrawdownPercent) config.maxDrawdownPercent = params.maxDrawdownPercent;
    if (params.commissionPercent) config.commissionPercent = params.commissionPercent;
    if (params.slippagePercent) config.slippagePercent = params.slippagePercent;
    if (params.leverage) config.leverage = params.leverage;

    return config;
  }
}

// ==========================================
// PARAMETER SENSITIVITY ANALYZER
// ==========================================

export class ParameterSensitivityAnalyzer {
  /**
   * Analyze sensitivity of parameters
   */
  public async analyze(
    candles: Candle[],
    baseConfig: BacktestConfig,
    parameter: ParameterSpace,
    numSteps: number = 10
  ): Promise<SensitivityAnalysisResult> {
    const variations: SensitivityAnalysisResult['variations'] = [];
    const step = (parameter.max - parameter.min) / numSteps;

    for (let i = 0; i <= numSteps; i++) {
      const value = parameter.min + (i * step);
      const testConfig = {
        ...baseConfig,
        [parameter.name]: value,
      };

      try {
        const engine = new BacktestingEngine(testConfig);
        const result = engine.runBacktest(candles);

        variations.push({
          value,
          returnPercent: result.totalReturnPercent,
          sharpeRatio: result.sharpeRatio,
          maxDrawdown: result.maxDrawdownPercent,
        });
      } catch (error) {
        console.error(`Error analyzing parameter ${parameter.name} at value ${value}:`, error);
      }
    }

    // Calculate sensitivity (slope of return vs parameter value)
    const returns = variations.map(v => v.returnPercent);
    const values = variations.map(v => v.value);

    const sensitivity = this.calculateSlope(values, returns);
    const robustness = Math.abs(sensitivity) > 0 ? 1 / Math.abs(sensitivity) : Infinity;

    const baseValue = (parameter.min + parameter.max) / 2;

    return {
      parameter: parameter.name,
      baseValue,
      variations,
      sensitivity,
      robustness,
    };
  }

  private calculateSlope(x: number[], y: number[]): number {
    const n = x.length;
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean);
      denominator += Math.pow(x[i] - xMean, 2);
    }

    return denominator !== 0 ? numerator / denominator : 0;
  }
}
