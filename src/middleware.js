import { asap, noop, check, is, isDev } from './utils'
import proc from './proc'
import emitter from './emitter'
import { MONITOR_ACTION } from './monitorActions'

export const NOT_ITERATOR_ERROR = "runSaga must be called on an iterator"

export default function createSagaMiddleware(...sagas) {
    const sagaEmitter = emitter()
    const monitor = isDev ? action => asap(() => dispatch(action)) : undefined
    let _dispatch
    function middleware({ getState, dispatch }) {
        _dispatch = dispatch

          sagas.forEach( saga => {
            proc(
              saga(getState),
              sagaEmitter.subscribe,
              dispatch,
              monitor,
              0,
              saga.name
            )
          })

      return next => action => {
        const result = next(action) // hit reducers
        // filter out monitor actions to avoid endless loop
        // see https://github.com/yelouafi/redux-saga/issues/61
        if(!action[MONITOR_ACTION])
          sagaEmitter.emit(action)
        return result;
      }
    }

    middleware.run = (iterator, { subscribe, dispatch }, monitor = noop) => {
        if (!subscribe) {
            subscribe = sagaEmitter.subscribe
        }

        if (!dispatch) {
            dispatch = _dispatch
        }

        check(iterator, is.iterator, NOT_ITERATOR_ERROR)

        return proc(
            iterator
            , subscribe
            , dispatch
            , monitor
        )
    }

    return middleware
}
