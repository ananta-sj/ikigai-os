export function LocalStorageRecovery() {
  return (
    <main className="ik-crash-shell" role="alert">
      <section className="ik-crash-card">
        <h1>Ikigai Space could not open local storage.</h1>
        <p>Check that storage is available for Ikigai Space and that your device has free space, then try again. Your existing data has not been reset.</p>
        <button type="button" className="ik-button ik-button-primary" onClick={() => window.location.reload()}>Retry opening Ikigai Space</button>
      </section>
    </main>
  );
}
