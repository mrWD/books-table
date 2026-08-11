import { createIdbStorage } from 'tables-core'
import { useUi } from '../store/ui'

/**
 * The app's one storage instance. The adapter itself lives in `tables-core`, shared with
 * FilmTable and GamesTable; what belongs here is the database name and what a failed
 * write should say to this app's user.
 */
export const idbStorage = createIdbStorage({
  dbName: 'bookstable-kv',
  onWriteError: () => useUi.getState().showToast('Saving failed — export a backup from your profile'),
})
