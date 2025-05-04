// Utility to log user actions in the frontend
//
// Use logFrontendAction for all user action logging:
//   logFrontendAction({ actionType: 'LOGIN ATTEMPT', component: 'LoginPage', details: { ... } })
// This ensures all logs are consistently tagged as [FRONTEND ACTION] [ACTION_TYPE].

export type UserActionLog = {
    action: string;
    component: string;
    timestamp: string;
    level?: 'alert' | 'error' | 'warning' | 'info' | 'debug';
    details?: Record<string, any>;
  };
  
  export async function logUserAction({ action, component, level = 'info', details }: { action: string; component: string; level?: UserActionLog['level']; details?: Record<string, any> }) {
    const log: UserActionLog = {
      action,
      component,
      timestamp: new Date().toISOString(),
      level,
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

/**
 * Helper to log user actions with enforced [FRONTEND ACTION] [ACTION_TYPE] tagging.
 * Usage: logFrontendAction({ actionType: 'LOGIN ATTEMPT', component: 'LoginPage', level: 'error', details: {...} })
 */
export async function logFrontendAction({ actionType, component, level = 'info', details }: { actionType: string; component: string; level?: UserActionLog['level']; details?: Record<string, any> }) {
  const tag = `[FRONTEND ACTION] [${actionType.toUpperCase()}]`;
  await logUserAction({ action: tag, component, level, details });
}