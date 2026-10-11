// Tipagem do bridge exposto em preload/index.ts. O `export {}` é só pra
// forçar o TS a tratar este arquivo como módulo — sem isso, `declare global`
// não tem efeito e `window.zapmirror` fica implicitamente `any` (TS2669).
export {};

declare global {
  interface Window {
    zapmirror: {
      listDevices: () => Promise<{ serial: string; state: string; model?: string }[]>;
    };
  }
}

async function render() {
  const devicesEl = document.getElementById('devices')!;

  const devices = await window.zapmirror.listDevices();
  devicesEl.innerHTML = devices.length
    ? devices
        .map(
          (d) =>
            `<div class="device">${d.model ?? d.serial} — ${d.state}</div>`,
        )
        .join('')
    : 'Nenhum dispositivo detectado ainda. Conecte um Android por USB e autorize a depuração no aparelho.';
}

render();
