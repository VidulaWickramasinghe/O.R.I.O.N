import { AuroraCard } from "../aurora-card";

type SimpleModuleProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function SimpleModule({ title, description, children }: SimpleModuleProps) {
  return (
    <AuroraCard className="min-h-[calc(100vh-130px)] p-8">
      <h2 className="text-3xl font-black text-white">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
        {description}
      </p>

      <div className="mt-8">{children}</div>
    </AuroraCard>
  );
}
