export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900">
          KIRA
        </h1>

        <p className="text-gray-500 mt-4 text-lg">
          Asset Management System
        </p>

        <a
          href="/dashboard"
          className="inline-block mt-8 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition"
        >
          Open Dashboard
        </a>
      </div>
    </main>
  );
}