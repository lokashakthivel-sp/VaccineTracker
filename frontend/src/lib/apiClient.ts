/**
 * Python API client — calls the FastAPI microservice.
 * Base URL from VITE_API_URL (defaults to localhost:8000).
 */

import { SetupInfo } from "@/types";

const API_BASE =
  (import.meta.env.VITE_API_URL as string) ?? "http://localhost:8000";

/** Download a PDF certificate. Triggers browser file download. */
export async function downloadCertificate(
  childId: string,
  childName: string,
  options: { includePending?: boolean; generatedBy?: string } = {},
): Promise<{ error: string | null }> {
  try {
    const params = new URLSearchParams();
    if (options.includePending) params.set("include_pending", "true");
    if (options.generatedBy) params.set("generated_by", options.generatedBy);

    const response = await fetch(
      `${API_BASE}/certificates/${childId}?${params}`,
    );
    if (!response.ok) {
      const text = await response.text();
      return { error: `PDF generation failed (${response.status}): ${text}` };
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VaccineTrack_${childName.replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { error: null };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Network error — is the API running?",
    };
  }
}

/** Save a parent's phone number via the Python API (normalises to E.164). */
export async function savePhoneNumber(
  parentId: string,
  phoneNumber: string,
): Promise<{ success: boolean; phone_e164?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/whatsapp/phone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parent_id: parentId, phone_number: phoneNumber }),
    });
    const data = (await res.json()) as {
      success: boolean;
      phone_number_e164: string;
      error?: string;
    };
    return {
      success: data.success,
      phone_e164: data.phone_number_e164,
      error: data.error,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/** Fetch Green API setup info. **/
export async function getSetupInfo(): Promise<SetupInfo | null> {
  try {
    const res = await fetch(`${API_BASE}/whatsapp/setup-info`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

/** Quick health check — returns true if the Python API is reachable. */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
