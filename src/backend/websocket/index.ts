/**
 * TIME WebSocket Module
 *
 * Exports all WebSocket-related services for real-time communication.
 */

export * from './realtime_service';
export * from './event_hub';

// Re-export singleton instance
export { realtimeService } from './realtime_service';
