/**
 * Bir pinin o anki görsel durumu (baloncuk boyutu/görünürlüğü ve MagicRings'i
 * yöneten tek kaynak — MapScreen'de hesaplanır, LocationMarker/MarkerRingsLayer
 * tüketir):
 *  - idle: normal float, tam boy, ring yok.
 *  - preview: boşta 10 sn'lik tanıtım döngüsünde sırası gelen pin — küçülür
 *    (KAYBOLMAZ) + MagicRings görünür.
 *  - countdown: imleç dwell'inde (3 sn geri sayım) — tam boy + MagicRings.
 *  - active: seçim tamamlandı (video oynuyor) — baloncuk ve ring tamamen kaybolur.
 *  - suppressed: NEIGHBOR_SUPPRESS'teki bir komşusu şu an countdown/preview'da
 *    olduğu için görünürlüğü bilerek engellenen pin (üst üste binmeyi önler).
 */
export type MarkerVisualState = 'idle' | 'preview' | 'countdown' | 'active' | 'suppressed'

/**
 * Haritada birbirine çok yakın düşen pin çiftleri: anahtar (primary) meşgulken
 * — yalnız hover(countdown)/standby(preview) sırasında, TAM aktivasyonda DEĞİL
 * (kullanıcı isteği) — değerdeki (suppressed) pinin baloncuğu/ili görünürlüğü
 * engellemesin diye tamamen gizlenir.
 */
export const NEIGHBOR_SUPPRESS: Record<string, string> = {
  'kirklareli-kucukyayla-tekir': 'edirne-malkoclar',
  'balikesir-susurluk': 'izmir-ovacik',
  'amasya-kayaduzu': 'tokat-killik'
}
