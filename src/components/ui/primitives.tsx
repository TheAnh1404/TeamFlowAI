import type { ButtonHTMLAttributes, ReactNode } from "react";
export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`tf-button ${className}`} {...props}/>; }
export function Alert({ children }: {
    children: ReactNode;
}) { return <div className="tf-alert" role="alert">{children}</div>; }
export function Badge({ children }: {
    children: ReactNode;
}) { return <span className="tf-badge">{children}</span>; }
export function Stepper({ step, labels }: {
    step: number;
    labels: string[];
}) { return <ol className="tf-steps" aria-label="Các bước tạo dự án">{labels.map((s, i) => <li key={s} aria-current={step === i + 1 ? "step" : undefined}><span>{i + 1}</span>{s}</li>)}</ol>; }
