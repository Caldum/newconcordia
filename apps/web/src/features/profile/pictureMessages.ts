import { defineMessages } from '../../i18n';

/** Choosing a picture, the same for a citizen, a party and a regiment. */
export const pictureMessages = defineMessages({
  es: {
    hint: 'PNG, JPEG o WebP de hasta 10 MB. Se recorta al centro en un cuadrado.',
    choose: 'Elegir una foto',
    saving: 'Subiendo…',
    remove: 'Quitar la foto',
    saved: 'La foto está guardada.',
    removed: 'Se quitó la foto.',
    error_picture_invalid: 'Esa foto no se pudo leer. Prueba con un PNG, JPEG o WebP.',
    error_picture_upload_failed: 'No se pudo subir la foto. Prueba con otra más liviana.',
    error_not_party_leader: 'Solo quien lidera el partido cambia su foto.',
    error_not_regiment_leader: 'Solo quien lidera el regimiento cambia su foto.',
    error_other: 'No se pudo completar. Revisa tu conexión y vuelve a intentar.',
  },
  en: {
    hint: 'PNG, JPEG or WebP up to 10 MB. It is cut to a centered square.',
    choose: 'Choose a picture',
    saving: 'Uploading…',
    remove: 'Remove the picture',
    saved: 'The picture is saved.',
    removed: 'The picture was removed.',
    error_picture_invalid: 'That picture could not be read. Try a PNG, JPEG or WebP.',
    error_picture_upload_failed: 'The picture did not upload. Try a lighter one.',
    error_not_party_leader: 'Only the party leader changes its picture.',
    error_not_regiment_leader: 'Only the regiment leader changes its picture.',
    error_other: 'It did not go through. Check your connection and try again.',
  },
});
