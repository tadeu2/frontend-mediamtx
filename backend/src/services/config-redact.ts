const SENSITIVE_KEY_PATTERN = /(password|secret|token|key|credential|passphrase)/i;

export function redactConfigYaml(yaml: string): string {
  return yaml
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^(\s*['"]?)([\w.-]+)(['"]?\s*:\s*)(.*)$/);
      if (!match) return line;

      const [, prefix, key, separator, value] = match;
      if (!SENSITIVE_KEY_PATTERN.test(key)) {
        return line;
      }

      const hasValue = value.trim().length > 0;
      return `${prefix}${key}${separator}${hasValue ? '***REDACTED***' : value}`;
    })
    .join('\n');
}
