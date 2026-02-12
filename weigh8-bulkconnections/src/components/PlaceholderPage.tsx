export default function PlaceholderPage({ title }: { title: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
            <div className="p-4 rounded-full bg-slate-900/50 border border-slate-800">
                <h1 className="text-2xl font-bold text-white">{title}</h1>
            </div>
            <p className="text-slate-400 max-w-md">
                This module is currently under development. The interface and functionality for {title} will be implemented in the next phase.
            </p>
        </div>
    );
}
