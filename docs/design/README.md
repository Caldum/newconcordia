# Design references

Everything here comes from the handoff kit. It is the reference the app is built from, not code to ship.

| Folder | Content |
| --- | --- |
| `canvas/` | The 52 screens as exported by the design canvas (`*.dc.html`) and their index (`canvas.json`) |
| `atlas/` | The Atlas design system: `tokens.json`, the brand manual (`README.md`) and each component's README and preview |
| `assets/` | Original icons, illustrations, logos and silhouettes |
| `tools/` | `flags.py`, the reference for the `Flag` component |

## Language

File names, folder names, token names, CSS classes and documentation are in English (ADR 0004). The
interface copy inside the screens and previews is Spanish, because it is the reviewed source copy of the
game. Local helper class names and inline scripts inside the exported `*.dc.html` files were left as
exported: they are generated markup, not code we maintain.

## Screen index

In canvas order.

| Screen file | Original name | Canvas page | Title |
| --- | --- | --- | --- |
| `Train` | Entrenar | Home and map | Training |
| `Missions` | Misiones | Home and map | Missions |
| `Work` | Trabajo | Economy | Work |
| `Company` | Empresa | Economy | My company |
| `FoundCompany` | FundarEmpresa | Economy | Found a company |
| `Inventory` | Inventario | Economy | Inventory and account |
| `Bank` | Banco | Economy | Banks |
| `BankTender` | Licitacion | Economy | Bank tender |
| `Market` | Mercado | Economy | Market |
| `Sell` | Vender | Economy | Sell a product |
| `Wars` | Guerras | War | Wars and battles |
| `Battle` | Batalla | War | Live battle |
| `BattleEnd` | BatallaFin | War | Battle over |
| `OpenBattle` | AbrirBatalla | War | Open a battle |
| `Hospital` | Hospital | War | Field hospitals |
| `Country` | Pais | Politics and government | Country |
| `Cabinet` | Gabinete | Politics and government | Cabinet |
| `Treasury` | Tesoro | Politics and government | Treasury |
| `Congress` | Congreso | Politics and government | Congress and laws |
| `ProposeLaw` | ProponerLey | Politics and government | Propose a law |
| `Elections` | Elecciones | Politics and government | Elections |
| `CitizenshipRequests` | Ciudadanias | Politics and government | Citizenship requests |
| `Resources` | Recursos | Politics and government | Resources and deposits |
| `News` | Noticias | Society and profile | Press |
| `Article` | Articulo | Society and profile | Article |
| `WriteArticle` | Escribir | Society and profile | Write an article |
| `Messages` | Mensajes | Society and profile | Messages and notices |
| `Rankings` | Rankings | Society and profile | Rankings |
| `Profile` | Perfil | Society and profile | Profile |
| `Settings` | Ajustes | Society and profile | Account settings |
| `ChangeCitizenship` | CambiarCiudadania | Society and profile | Change country |
| `PublicProfile` | PerfilPublico | Society and profile | Another player's profile |
| `Admin` | Admin | Administration | Admin · countries and season |
| `AdminPlayers` | AdminJugadores | Administration | Admin · players and moderation |
| `Brand` | Marca | System | Brand |
| `Illustrations` | Ilustraciones | System | Section illustrations |
| `System` | Sistema | System | System and states |
| `NavBar` | Barra | System | Navigation bar |
| `Error404` | Error404 | System | Page not found |
| `Maintenance` | Mantenimiento | System | Maintenance |
| `SessionExpired` | SesionVencida | System | Session expired |
| `Home` | Main | Home and map | Home |
| `Map` | Mapa | Home and map | Map |
| `Landing` | Landing | Entry | Landing |
| `SignUp` | Registro | Entry | Sign-up · step 1 |
| `CountryNotPlayable` | PaisNoJugable | Entry | Sign-up · country not in play |
| `EmailVerification` | Verificacion | Entry | Email verification |
| `Welcome` | Bienvenida | Entry | Welcome to the country |
| `SignIn` | Login | Entry | Sign in |
| `RecoverPassword` | Recuperar | Entry | Forgot my password |
| `RecoverPasswordSent` | RecuperarEnviado | Entry | Recovery email sent |
| `NewPassword` | NuevaClave | Entry | Create a new password |
