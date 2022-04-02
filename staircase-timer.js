module.exports = function(RED) {
    "use strict";

    const nodes = [];
    let interval = null;

    const pad = function(number) {
        if (number < 10) {
            return '0' + number;
        }
        return number;
    }

    const toISODate = function(date) {
        return date.getFullYear() +
            '-' + pad(date.getMonth() + 1) +
            '-' + pad(date.getDate())
    };
    const toISOTime = function(date) {
        const offset = date.getTimezoneOffset();
        let tz = "Z";
        if (offset > 0) {
            tz = "+" + pad(Math.floor(offset / 60)) + ":" + pad(Math.floor(offset % 60));
        } else if (offset > 0) {
            tz = "-" + pad(Math.floor((-offset) / 60)) + ":" + pad(Math.floor((-offset) % 60));
        }
        return pad(date.getUTCHours()) +
            ':' + pad(date.getUTCMinutes()) +
            ':' + pad(date.getUTCSeconds()) +
            tz;
    };
    const toISO = function(date) {
        return toISODate(date) + "T" + toISOTime(date);
    }

    const turnOn = function(node) {
        node.state = 'on';
        const now = Date.now();
        node.endTime = now + node.timeout * 1000;
        const until = new Date(node.endTime);
        let endTime = (new Date(now).toDateString() === until.toDateString()) ? toISOTime(until) : toISO(until);
        let untilString = "on until " + endTime;
        node.untilString = untilString;
        if (node.communicative) {
            untilString += " (" + Math.ceil((node.endTime - now) / 1000) + "s)";
        }
        node.status({fill: "green", shape: "dot", text: untilString});
    }
    const turnOff = function(node) {
        node.state = 'off';
        node.endTime = -1;
        node.status({fill: "grey", shape: "dot", text: "off"});
    }

    const noopAction = function(node) {
    };

    const startAction = function(node, msg, send) {
        node.log("start");
        turnOn(node);
        send({
            ...msg,
            payload: JSON.parse(node.onPayloadJson)
        });
    }

    const renewAction = function(node) {
        node.log("renew");
        turnOn(node);
    }

    const stopAction = function(node, msg, send) {
        node.log("stop");
        turnOff(node);
        send({
            ...msg,
            payload: JSON.parse(node.offPayloadJson)
        });
    }

    const timedOut = function(node) {
        node.log("timeout");
        turnOff(node);
        node.send({
            payload: JSON.parse(node.offPayloadJson)
        });
    }

    const check = function() {
        const now = Date.now();
        for (let idx = 0; idx < nodes.length; idx++) {
            const node = nodes[idx];
            if (node.state === 'on' && node.endTime > 0) {
                if (node.endTime <= now) {
                    timedOut(node);
                } else if (node.communicative) {
                    let untilString = node.untilString;
                    untilString += " (" + Math.ceil((node.endTime - now) / 1000) + "s)";
                    node.status({fill: "green", shape: "dot", text: untilString});
                }
            }
        }
    }

    const born = function(node) {
        nodes.push(node);
        if (nodes.length === 1) {
            if (interval !== null) {
                clearInterval(interval);
            }
            interval = setInterval(check, 1000);
        }
    }

    const died = function(node) {
        const idx = nodes.indexOf(node);
        if (idx > -1) {
            nodes.splice(idx, 1);
        }
        if (nodes.length === 0) {
            if (interval !== null) {
                clearInterval(interval);
            }
            interval = null;
        }
    }

    const getTypedVal = function(type, strVal) {
        if (type === 'num') {
            return parseFloat(strVal);
        }
        if (type === 'bool') {
            return strVal === 'true';
        }
        if (type === 'json') {
            return JSON.parse(strVal);
        }
        return strVal;
    }

    function StaircaseTimer(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node.timeout = parseInt(config.timeout);
        node.onPayloadJson = JSON.stringify(getTypedVal(config.onPayloadType, config.onPayload) || 'on');
        node.offPayloadJson = JSON.stringify(getTypedVal(config.offPayloadType, config.offPayload) || 'off');
        node.renewable = config.renewable || '';
        node.communicative = config.communicative || '';
        node.state = 'off';
        node.endTime = -1;

        const renewOrNoop = node.renewable ? renewAction : noopAction;
        const stateMachine = {
            on: {
                on: renewOrNoop,
                start: renewOrNoop,
                "1": renewOrNoop,
                "true": renewOrNoop,
                toggle: stopAction,
                off: stopAction,
                stop: stopAction,
                "0": stopAction,
                "false": stopAction
            },
            off: {
                on: startAction,
                start: startAction,
                "1": startAction,
                "true": startAction,
                toggle: startAction,
                off: noopAction,
                stop: noopAction,
                "0": noopAction,
                "false": noopAction
            }
        }

        node.warn("created staircase-timer with config " + JSON.stringify(config));

        node.on('input', function(msg, send, done) {
            node.log("received " + JSON.stringify(msg));
            send = send || function() { node.send.apply(node,arguments) }
            if (stateMachine[node.state]) {
                const action = stateMachine[node.state]['' + msg.payload];
                if (action) {
                    action(node, msg, send);
                    if (done) {
                        done();
                    }
                } else {
                    if (done) {
                        // Node-RED 1.0 compatible
                        done("don't know what to do with payload '" + msg.payload + "' in state '" + node.state + "'");
                    } else {
                        // Node-RED 0.x compatible
                        node.error("don't know what to do with payload '" + msg.payload + "' in state '" + node.state + "'", msg);
                    }
                }
            } else {
                if (done) {
                    // Node-RED 1.0 compatible
                    done("no actions found for state '" + node.state + "'");
                } else {
                    // Node-RED 0.x compatible
                    node.error("no actions found for state '" + node.state + "'", msg);
                }
            }
        });

        node.on("close", function() {
            died(node);
        });

        born(node);
    }
    RED.nodes.registerType("staircase-timer", StaircaseTimer);
}