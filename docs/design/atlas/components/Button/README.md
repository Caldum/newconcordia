# Button

The button says exactly what happens, starting with the verb: «Entrar a combatir», «Crear mi ciudadano».
Never «Enviar» or «Aceptar» (Submit, OK).

- `at-btn-primary` (ink): the screen's action. One per view.
- `at-btn-war` (war): only to fight or open a battle, at most one per screen.
- `at-btn-secondary`: alternatives. Its border uses `line-control`.
- `at-btn-ghost`: back, cancel and low-weight actions.
- `at-btn-light` and `at-btn-outline-light`: on `ink` or on the stage.
- `at-btn-large` (56 px, `touch-primary`): the primary button of the Entry screens and the Hit button.
- Disabled: `disabled` or `at-btn-off`, and the text changes to say why («Ya trabajaste hoy»).

What the caller provides: the text, the optional icon (18 px, on the left) and the destination (`a href`) or
the action (`button`). Minimum height `touch-min`, 44 px.
