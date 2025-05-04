// Utility to log user actions in the frontend

export type UserActionLog = {
    action: string;
    component: string;
    timestamp: string;
    details?: Record<string, any>;
  };
  
  export async function logUserAction({ action, component, details }: { action: string; component: string; details?: Record<string, any> }) {
    const log: UserActionLog = {
      action,
      component,
      timestamp: new Date().toISOString(),
      details,
    };
    try {
      await fetch("http://localhost:8000/api/log_user_action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      });
    } catch (err) {
      // Fallback to console if backend is unreachable
      // eslint-disable-next-line no-console
      console.error("Failed to log user action", err, log);
    }
  }