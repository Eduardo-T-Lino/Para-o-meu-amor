# Para minha princesa

Site estático: sirva a pasta por HTTP (por exemplo, `python -m http.server 8000`) ou pela Vercel. A navegação interna preserva o login e o acompanhamento da leitura entre as páginas.

## Vídeo final

O vídeo publicado é `assets/video-final.mp4`, vinculado em `config.js`. O arquivo original `video.mp4` continua na pasta principal, preservado localmente e excluído do Git e do deploy por causa do tamanho. Ao percorrer o último dos seis capítulos, a aplicação abre a mensagem automaticamente, sem precisar voltar à página principal.

Para trocar o vídeo, atualize `finalVideoSrc` em `config.js` com o novo caminho ou a URL direta de um vídeo hospedado. MP4 com H.264/AAC é uma opção compatível com navegadores.

Enquanto o endereço estiver vazio, a página final mostra uma mensagem de espera. O vídeo só é carregado após percorrer os seis capítulos inteiros. A conclusão é registrada automaticamente, em segundo plano, quando os textos e as fotos foram percorridos até o fim. Não há barras, contadores, selos nem botões de confirmação. Esse registro fica salvo neste navegador, em `localStorage` (`ana-chapters-completed-v1`).

Ao terminar o último capítulo que faltava, a mensagem final abre automaticamente uma única vez durante essa leitura. Depois disso, a usuária pode reler qualquer capítulo e circular normalmente pelos links, sem ser enviada novamente ao vídeo. A página principal não tem seção, aviso ou atalho que antecipe a mensagem. Ao terminar o vídeo, a aplicação volta a `principal.html`.

## Música em outra aba

A única música é **Mil Anos**, no endereço `https://www.youtube.com/watch?v=KrAlYZGz9f8&autoplay=1`, definido em `experience.js` na constante `musicURL`. Não há playlist, iframe, API ou player de música dentro do site.

Ao enviar o login válido, o site tenta abrir o YouTube em uma nova aba. Para uma sessão já verificada, a tentativa acontece no primeiro clique em um link interno. A tentativa é feita apenas uma vez por sessão, registrada em `sessionStorage` (`ana-mil-anos-attempted-v1`), sem reabrir a música a cada capítulo, recarga ou retorno do vídeo.

O link discreto **Mil Anos ↗**, no menu da página principal, dos capítulos e da mensagem final, permite abrir a música manualmente, inclusive se o navegador bloquear a abertura inicial. A reprodução automática depende das permissões do navegador e do YouTube.

Pausar, retomar e repetir ficam sob controle da usuária na aba do YouTube. O site não pausa nem retoma essa aba automaticamente, inclusive durante o vídeo final.

## Verificação

Com Node.js e Python disponíveis, execute `npm install`, `npx playwright install chromium` e `npm test`. Para usar o Chrome instalado, defina `PLAYWRIGHT_CHANNEL=chrome`.

Os testes cobrem login, abertura única da música, link externo em nova aba, ausência de player e de referência ao vídeo na principal, conclusão automática dos seis capítulos sem indicadores, navegação livre após a mensagem, bloqueio do vídeo, retorno ao início, vídeo incluído no projeto e layout em celular. As páginas externas do YouTube são simuladas para não depender de anúncios, rede ou permissões de reprodução.
