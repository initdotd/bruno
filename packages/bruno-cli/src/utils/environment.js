/**
 * Parse a Bruno JSON environment structure and normalize variables.
 *
 * Supports:
 * - Single environment object: { name?, uid?, variables: [...] }
 * - Array of environment objects: [ { name, uid?, variables }, ... ]
 * - Wrapper object: { environments: [ ... ], activeGlobalEnvironmentUid? }
 *
 * The optional options argument lets callers select a specific environment
 * when multiple are present.
 */
const selectEnvironment = (parsed, options = {}) => {
  const { name, uid, activeUid } = options;

  // Case 1: wrapper object with environments array
  if (parsed && Array.isArray(parsed.environments)) {
    const envs = parsed.environments;

    if (name) {
      const byName = envs.find((env) => typeof env.name === 'string' && env.name.trim() === name.trim());
      if (!byName) {
        throw new Error(`Environment with name "${name}" not found in global environments JSON`);
      }
      return byName;
    }

    const resolvedActiveUid = uid || activeUid || parsed.activeGlobalEnvironmentUid;
    if (resolvedActiveUid) {
      const byUid = envs.find((env) => env.uid === resolvedActiveUid);
      if (!byUid) {
        throw new Error('Active environment UID not found in global environments JSON');
      }
      return byUid;
    }

    if (envs.length === 1) {
      return envs[0];
    }

    throw new Error('Ambiguous global environments JSON: multiple environments present but no selector provided');
  }

  // Case 2: array of environments
  if (Array.isArray(parsed)) {
    const envs = parsed;

    if (name) {
      const byName = envs.find((env) => typeof env.name === 'string' && env.name.trim() === name.trim());
      if (!byName) {
        throw new Error(`Environment with name "${name}" not found in environments JSON array`);
      }
      return byName;
    }

    const resolvedActiveUid = uid || activeUid;
    if (resolvedActiveUid) {
      const byUid = envs.find((env) => env.uid === resolvedActiveUid);
      if (!byUid) {
        throw new Error('Active environment UID not found in environments JSON array');
      }
      return byUid;
    }

    if (envs.length === 1) {
      return envs[0];
    }

    throw new Error('Ambiguous environments JSON array: multiple environments present but no selector provided');
  }

  // Case 3: assume single environment object
  return parsed;
};

/**
 * Normalize a single Bruno environment object into the shape expected by getEnvVars.
 */
const normalizeEnvironment = (parsed = {}) => {
  if (!parsed || !Array.isArray(parsed.variables)) {
    throw new Error('Invalid environment JSON: expected an environment object with a "variables" array');
  }

  const normalized = {
    name: parsed.name,
    variables: (parsed.variables || []).filter(Boolean).map((variable) => ({
      name: variable.name,
      value: variable.value,
      type: variable.type || 'text',
      enabled: variable.enabled !== false,
      secret: variable.secret || false
    }))
  };

  return normalized;
};

/**
 * Public API: parse a Bruno JSON environment structure, optionally selecting
 * a specific environment when multiple are present.
 */
const parseEnvironmentJson = (parsed = {}, options = {}) => {
  const selected = selectEnvironment(parsed, options);
  return normalizeEnvironment(selected);
};

module.exports = {
  parseEnvironmentJson
};
