declare const monaco: any;

export function loadMonaco(): Promise<void> {
  return new Promise((resolve) => {
    const onGotAmdLoader = () => {
      (window as any).require.config({
        paths: { vs: 'assets/monaco/vs' }
      });

      (window as any).require(['vs/editor/editor.main'], () => {
        resolve();
      });
    };

    if (!(window as any).require) {
      const loaderScript = document.createElement('script');
      loaderScript.type = 'text/javascript';
      loaderScript.src = 'assets/monaco/vs/loader.js';
      loaderScript.addEventListener('load', onGotAmdLoader);
      document.body.appendChild(loaderScript);
    } else {
      onGotAmdLoader();
    }
  });
}