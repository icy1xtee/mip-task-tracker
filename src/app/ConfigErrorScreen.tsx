export function ConfigErrorScreen({ missing }: { missing: string[] }) {
  return (
    <div className="mip">
      <main className="auth">
        <div className="auth-card">
          <h1 className="h1">Firebase не настроен</h1>
          <p className="sub">
            Скопируйте <code>.env.example</code> в <code>.env.local</code>, заполните значения из
            Firebase Console и перезапустите dev-сервер. Не заданы:
          </p>
          <ul
            className="list"
            style={{
              padding: '12px 16px 12px 32px',
              fontFamily: 'ui-monospace, monospace',
              fontSize: 13,
            }}
          >
            {missing.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
