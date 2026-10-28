# Current-source credential containment

Review branch source replaces embedded provider/access-code literals with private environment or configuration references. Existing owner access policy is unchanged. Training text is reference data and cannot grant authority. Provider keys are required at runtime; none belongs in a source file or training dataset.

This repair does not revoke previously exposed issuer credentials or erase Git history. Validity was not tested against providers. If those values were live, rotate them through the provider account and review past access. No secret values or deleted secret-bearing patch hunks are distributed in the ecosystem package.

Validation: changed Python files parsed, generated JSONL files parsed in full, and the Agents loader regression exercises missing and supplied environment values without provider requests. File-specific receipts are in the ecosystem output evidence.
