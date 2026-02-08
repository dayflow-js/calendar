type ViewConfigCarrier = {
  viewConfig?: Record<string, unknown>;
};

function pickDefinedValues<
  TConfig extends object,
  TKey extends keyof TConfig,
>(config: Partial<TConfig>, keys: readonly TKey[]): Partial<Pick<TConfig, TKey>> {
  const picked: Partial<Pick<TConfig, TKey>> = {};

  for (const key of keys) {
    const value = config[key];
    if (value !== undefined) {
      picked[key] = value as TConfig[TKey];
    }
  }

  return picked;
}

export function buildFactoryViewConfig<
  TConfig extends ViewConfigCarrier,
  TKey extends Extract<keyof TConfig, string>,
>(
  defaultConfig: TConfig,
  config: Partial<TConfig>,
  keys: readonly TKey[]
): Record<string, unknown> {
  return {
    ...pickDefinedValues<TConfig, TKey>(defaultConfig, keys),
    ...(defaultConfig.viewConfig ?? {}),
    ...(config.viewConfig ?? {}),
    ...pickDefinedValues<TConfig, TKey>(config, keys),
  };
}
