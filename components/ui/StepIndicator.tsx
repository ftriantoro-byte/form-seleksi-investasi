const STEPS = [
  { key: "A", label: "Identitas" },
  { key: "B", label: "Gate" },
  { key: "C", label: "Skoring" },
  { key: "D", label: "Hasil" },
] as const;

export function StepIndicator({ current }: { current: "A" | "B" | "C" | "D" }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="mb-8 flex items-center">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold transition-colors duration-200 ${
                  isCurrent
                    ? "bg-zinc-900 text-white"
                    : isDone
                      ? "bg-zinc-900/10 text-zinc-500"
                      : "bg-zinc-100 text-zinc-300"
                }`}
              >
                {step.key}
              </div>
              <span
                className={`text-[11px] font-medium ${isCurrent ? "text-zinc-900" : "text-zinc-400"}`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-2 h-px flex-1 transition-colors duration-200 ${
                  isDone ? "bg-zinc-900/15" : "bg-zinc-100"
                }`}
                style={{ marginBottom: "18px" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
