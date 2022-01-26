module.exports = function(RED) {
    "use strict";

    const nodes = [];
    let interval = null;

    const turnOn = function(node) {
        node.state = 'on';
        node.endTime = Date.now() + node.timeout * 1000;
        node.status({fill:"green", shape:"dot", text:"on"});
    }
    const turnOff = function(node) {
        node.state = 'off';
        node.endTime = -1;
        node.status({fill:"grey", shape:"dot", text:"off"});
    }

    const noopAction = function(node) {
    };

    const startAction = function(node, msg, send) {
        node.log("start");
        turnOn(node);
        send({
            ...msg,
            payload: node.onPayload
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
            payload: node.offPayload
        });
    }

    const timedOut = function(node) {
        node.log("timeout");
        turnOff(node);
        node.send({
            payload: node.offPayload
        });
    }

    const check = function() {
        const now = Date.now();
        for (let idx = 0; idx < nodes.length; idx++) {
            const node = nodes[idx];
            if (node.state === 'on' && node.endTime > 0 && node.endTime <= now) {
                timedOut(node);
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
        node.onPayload = getTypedVal(config.onPayloadType, config.onPayload) || 'on';
        node.offPayload = getTypedVal(config.offPayloadType, config.offPayload) || 'off';
        node.renewable = config.renewable || '';
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