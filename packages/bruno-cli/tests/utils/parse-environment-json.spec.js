const { describe, it, expect } = require('@jest/globals');
const { getEnvVars } = require('../../src/utils/bru');
const { parseEnvironmentJson } = require('../../src/utils/environment');

describe('parseEnvironmentJson', () => {
  it('normalizes single environment object', () => {
    const input = {
      name: 'My Env',
      variables: [
        { name: 'host', value: 'https://www.httpfaker.org' },
        { name: 'token', value: 'abc', enabled: false, secret: true }
      ]
    };
    const env = parseEnvironmentJson(input);
    expect(Array.isArray(env.variables)).toBe(true);
    expect(env.variables[0]).toEqual({
      name: 'host',
      value: 'https://www.httpfaker.org',
      type: 'text',
      enabled: true,
      secret: false
    });
    expect(env.variables[1].enabled).toBe(false);
    expect(env.variables[1].secret).toBe(true);

    const vars = getEnvVars(env);
    expect(vars).toEqual({ host: 'https://www.httpfaker.org' });
  });

  it('throws on invalid shape', () => {
    expect(() => parseEnvironmentJson({ name: 'x' })).toThrow(/Invalid environment JSON/i);
  });

  it('respects explicit fields and preserves secret flag', () => {
    const input = {
      name: 'My Env',
      variables: [
        { name: 'one', value: '1', type: 'text', enabled: true, secret: true },
        { name: 'two', value: '2', type: 'file', enabled: false, secret: false }
      ]
    };
    const env = parseEnvironmentJson(input);

    expect(env.variables[0]).toEqual({
      name: 'one',
      value: '1',
      type: 'text',
      enabled: true,
      secret: true
    });
    expect(env.variables[1]).toEqual({
      name: 'two',
      value: '2',
      type: 'file',
      enabled: false,
      secret: false
    });

    const vars = getEnvVars(env);
    expect(vars).toEqual({ one: '1' });
  });

  it('defaults secret to false for undefined and null', () => {
    const input = {
      name: 'My Env',
      variables: [
        { name: 'three', value: '3', enabled: true },
        { name: 'four', value: '4', enabled: true, secret: null }
      ]
    };
    const env = parseEnvironmentJson(input);

    expect(env.variables[0]).toEqual({
      name: 'three',
      value: '3',
      type: 'text',
      enabled: true,
      secret: false
    });
    expect(env.variables[1]).toEqual({
      name: 'four',
      value: '4',
      type: 'text',
      enabled: true,
      secret: false
    });

    const vars = getEnvVars(env);
    expect(vars).toEqual({ three: '3', four: '4' });
  });

  it('selects environment by name from global environments wrapper', () => {
    const input = {
      environments: [
        {
          uid: 'one',
          name: 'Local',
          variables: [
            { name: 'host', value: 'http://localhost:3000', type: 'text', enabled: true, secret: false }
          ]
        },
        {
          uid: 'two',
          name: 'Prod',
          variables: [
            { name: 'host', value: 'https://prod.example.com', type: 'text', enabled: true, secret: false }
          ]
        }
      ],
      activeGlobalEnvironmentUid: 'two'
    };

    const env = parseEnvironmentJson(input, { name: 'Local' });
    const vars = getEnvVars(env);

    expect(vars).toEqual({ host: 'http://localhost:3000' });
  });

  it('falls back to activeGlobalEnvironmentUid when no name is provided', () => {
    const input = {
      environments: [
        {
          uid: 'one',
          name: 'Local',
          variables: [
            { name: 'host', value: 'http://localhost:3000', type: 'text', enabled: true, secret: false }
          ]
        },
        {
          uid: 'two',
          name: 'Prod',
          variables: [
            { name: 'host', value: 'https://prod.example.com', type: 'text', enabled: true, secret: false }
          ]
        }
      ],
      activeGlobalEnvironmentUid: 'two'
    };

    const env = parseEnvironmentJson(input);
    const vars = getEnvVars(env);

    expect(vars).toEqual({ host: 'https://prod.example.com' });
  });

  it('selects environment from array by name', () => {
    const input = [
      {
        uid: 'one',
        name: 'Local',
        variables: [
          { name: 'host', value: 'http://localhost:3000', type: 'text', enabled: true, secret: false }
        ]
      },
      {
        uid: 'two',
        name: 'Prod',
        variables: [
          { name: 'host', value: 'https://prod.example.com', type: 'text', enabled: true, secret: false }
        ]
      }
    ];

    const env = parseEnvironmentJson(input, { name: 'Prod' });
    const vars = getEnvVars(env);

    expect(vars).toEqual({ host: 'https://prod.example.com' });
  });

  it('throws when name not found in global environments', () => {
    const input = {
      environments: [
        { uid: 'one', name: 'Local', variables: [] }
      ]
    };

    expect(() => parseEnvironmentJson(input, { name: 'Missing' })).toThrow(/not found in global environments JSON/i);
  });

  it('throws when multiple environments present without selector', () => {
    const input = {
      environments: [
        { uid: 'one', name: 'Local', variables: [] },
        { uid: 'two', name: 'Prod', variables: [] }
      ]
    };

    expect(() => parseEnvironmentJson(input)).toThrow(/Ambiguous global environments JSON/i);
  });
});
