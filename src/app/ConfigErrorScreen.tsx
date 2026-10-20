export function ConfigErrorScreen({ missing }: { missing: string[] }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-ink text-2xl font-semibold">Firebase не настроен</h1>
      <p className="text-ink-muted text-sm">
        Скопируйте <code>.env.example</code> в <code>.env.local</code>, заполните значения из
        Firebase Console и перезапустите dev-сервер. Не заданы:
      </p>
      <ul className="rounded-control bg-surface-muted list-inside list-disc px-4 py-3 font-mono text-sm">
        {missing.map((key) => (
          <li key={key}>{key}</li>
        ))}
      </ul>
    </main>
  );
}
