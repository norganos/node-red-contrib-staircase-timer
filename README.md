# node-red-contrib-staircase-timer Readme

This package provides a node that mimics the behavior of a staircase timer relais:

- it can be switched on or off
- when switched on it will automatically turn off after n seconds (if not done manually)

In contrast to a flow composed of delays, this node prevents race conditions when multiple
on/off cycles occur within the timeout.

The node holds the current state (on or off), and only emits messages when the state changes.
This means that input messages that do not change the state (e.g. a start signal when it's already on)
have no direct effect.

## Possible Input Payloads

- `"start"` | `"on"` | `"1"` | `1` | `"true"` | `true` is a start signal
- `"stop"` | `"off"` | `"0"` | `0` | `"false"` | `false` is a stop signal
- `"toggle"` is either a start or a stop signal depending on the current state

## Configuration

- `timeout`: time in seconds after which the automatic off-signal is emitted
- `onPayload`: value that is put into payload of on-signals ("on" by default)
- `offPayload`: value that is put into payload of off-signals ("off" by default)
- `renewable`: boolean that specifies, if a start-signal while state is "on" will restart the timer
- `communicative`: boolean; if set to true, the node status is updated every second
