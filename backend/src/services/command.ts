import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 2_500;
const DEFAULT_MAX_BUFFER = 256 * 1024;

export interface SafeCommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  reason?: 'not_found' | 'timeout' | 'failed';
}

export async function runSafeCommand(
  file: string,
  args: string[],
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<SafeCommandResult> {
  try {
    const result = await execFileAsync(file, args, {
      timeout: timeoutMs,
      maxBuffer: DEFAULT_MAX_BUFFER,
      windowsHide: true,
      shell: false
    });

    return {
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr
    };
  } catch (error: unknown) {
    const withCode = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string; killed?: boolean };
    if (withCode.code === 'ENOENT') {
      return { ok: false, stdout: '', stderr: '', reason: 'not_found' };
    }

    if (withCode.killed) {
      return {
        ok: false,
        stdout: withCode.stdout ?? '',
        stderr: withCode.stderr ?? '',
        reason: 'timeout'
      };
    }

    return {
      ok: false,
      stdout: withCode.stdout ?? '',
      stderr: withCode.stderr ?? '',
      reason: 'failed'
    };
  }
}
