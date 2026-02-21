/* ── API Helpers ── */

export async function readErrorMessage(response: Response): Promise<string> {
    let message = `Request failed (${response.status})`;
    try {
        const errorJson = (await response.json()) as { error?: { message?: string } };
        if (errorJson.error?.message) message = errorJson.error.message;
    } catch { /* ignore */ }
    return message;
}

export async function apiGet<T>(url: string, parentUserId: string): Promise<T> {
    const response = await fetch(url, { method: "GET", headers: { "x-parent-user-id": parentUserId } });
    if (!response.ok) throw new Error(await readErrorMessage(response));
    return (await response.json()) as T;
}

export async function apiPost<T>(url: string, parentUserId: string, payload: unknown): Promise<T> {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-parent-user-id": parentUserId },
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await readErrorMessage(response));
    return (await response.json()) as T;
}

export function waitMs(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
    });
}
