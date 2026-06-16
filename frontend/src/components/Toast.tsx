import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

type ToastKind = "success" | "error";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastCtx {
  success: (msg: string) => void;
  error: (msg: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++counter;
      setToasts((t) => [...t, { id, kind, message }]);
      setTimeout(() => remove(id), 3000);
    },
    [remove],
  );

  const value: ToastCtx = {
    success: (m) => push("success", m),
    error: (m) => push("error", m),
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-lg border p-3 shadow-lg ${
              t.kind === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {t.kind === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            )}
            <span className="flex-1 text-sm">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
