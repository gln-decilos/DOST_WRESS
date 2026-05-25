export default function SectionTitle({ badge, icon, title, description }: { badge: string, icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-400/10 rounded-full px-6 py-1.5">
                {icon}
                <span>{badge}</span>
            </div>
            <div className="text-center mt-6 text-slate-700">
                <h2 className="text-3xl sm:text-4xl font-medium">{title}</h2>
                <p className="text-base max-w-xl mt-4 text-slate-500">{description}</p>
            </div>
        </div>
    );
}