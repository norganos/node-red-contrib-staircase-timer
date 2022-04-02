const helper = require("node-red-node-test-helper");
const timerNode = require("../staircase-timer.js");

describe('staircase-timer Node', function () {

    afterEach(function () {
        helper.unload();
    });

    it('should be loaded', function (done) {
        const flow = [{ id: "n1", type: "staircase-timer", name: "test name", timeout: "5" }];
        helper.load(timerNode, flow, function () {
            const n1 = helper.getNode("n1");
            n1.should.have.property('name', 'test name');
            n1.should.have.property('timeout', 5);
            n1.should.have.property('onPayloadJson', '"on"');
            n1.should.have.property('offPayloadJson', '"off"');
            n1.should.have.property('renewable', '');
            done();
        });
    });

    it('should initially be off', function (done) {
        const flow = [{ id: "n1", type: "staircase-timer", name: "test name", timeout: "5" }];
        helper.load(timerNode, flow, function () {
            const n1 = helper.getNode("n1");
            n1.should.have.property('state', 'off');
            done();
        });
    });

    for (let inMessage of ['on','start','1','true',1,true]) {
        it((typeof inMessage) + ' message "' + inMessage + '" while off should change state', function (done) {
            const flow = [
                { id: "n1", type: "staircase-timer", name: "test name", timeout: "2" }
            ];
            helper.load(timerNode, flow, function () {
                const n1 = helper.getNode("n1");
                n1.receive({ payload: inMessage });
                n1.should.have.property('state', 'on');
                done();
            });
        });
        it((typeof inMessage) + ' message "' + inMessage + '" while off should send on message', function (done) {
            const flow = [
                { id: "n1", type: "staircase-timer", name: "test name", timeout: "2", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];
            helper.load(timerNode, flow, function () {
                const n2 = helper.getNode("n2");
                const n1 = helper.getNode("n1");
                n2.on("input", function (msg) {
                    msg.should.have.property('payload', 'on');
                    done();
                });
                n1.receive({ payload: inMessage });
            });
        });
        it((typeof inMessage) + ' message "' + inMessage + '" while off should send custom message', function (done) {
            const flow = [
                { id: "n1", type: "staircase-timer", onPayload: "eingeschaltet", name: "test name", timeout: "2", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];
            helper.load(timerNode, flow, function () {
                const n2 = helper.getNode("n2");
                const n1 = helper.getNode("n1");
                n2.on("input", function (msg) {
                    msg.should.have.property('payload', 'eingeschaltet');
                    done();
                });
                n1.receive({ payload: inMessage });
            });
        });
        it('node should turn off again X seconds after ' + (typeof inMessage) + ' message "'+ inMessage + '"', function (done) {
            this.timeout(3000);
            this.slow(1800);
            const flow = [
                { id: "n1", type: "staircase-timer", name: "test name", timeout: "1", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];
            helper.load(timerNode, flow, function () {
                const n2 = helper.getNode("n2");
                const n1 = helper.getNode("n1");
                const start = Date.now();
                n1.receive({ payload: inMessage });
                n2.on("input", function (msg) {
                    msg.should.have.property('payload', 'off');
                    (Date.now()-start).should.aboveOrEqual(1000);
                    done();
                });
            });
        });
    }
    it('renew is ignored if not configured', function (done) {
        this.timeout(3000);
        this.slow(1800);
        const flow = [
            { id: "n1", type: "staircase-timer", name: "test name", timeout: "1", renewable: false, wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];
        helper.load(timerNode, flow, function () {
            const n2 = helper.getNode("n2");
            const n1 = helper.getNode("n1");
            const start = Date.now();
            n1.receive({ payload: "start" });
            setTimeout(() => n1.receive({ payload: "start" }), 700);
            n2.on("input", function (msg) {
                msg.should.have.property('payload', 'off');
                (Date.now()-start).should.aboveOrEqual(1000);
                (Date.now()-start).should.belowOrEqual(1600);
                done();
            });
        });
    });
    it('renew works if configured', function (done) {
        this.timeout(5000);
        this.slow(2700);
        const flow = [
            { id: "n1", type: "staircase-timer", name: "test name", timeout: "1", renewable: true, wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];
        helper.load(timerNode, flow, function () {
            const n2 = helper.getNode("n2");
            const n1 = helper.getNode("n1");
            const start = Date.now();
            n1.receive({ payload: "start" });
            setTimeout(() => n1.receive({ payload: "start" }), 700);
            n2.on("input", function (msg) {
                msg.should.have.property('payload', 'off');
                (Date.now()-start).should.aboveOrEqual(1700);
                done();
            });
        });
    });

    for (let inMessage of ['off','stop','0','false',0,false]) {
        it((typeof inMessage) + ' message "' + inMessage + '" while off should not change state', function (done) {
            const flow = [
                { id: "n1", type: "staircase-timer", name: "test name", timeout: "1" }
            ];
            helper.load(timerNode, flow, function () {
                const n1 = helper.getNode("n1");
                n1.receive({ payload: inMessage });
                n1.should.have.property('state', 'off');
                done();
            });
        });
        // it('message "' + inMessage + '" while off should not emit output', function (done) {
        //     const flow = [
        //         { id: "n1", type: "staircase-timer", name: "test name", timeout: "1", wires: [["n2"]] },
        //         { id: "n2", type: "helper" }
        //     ];
        //     helper.load(timerNode, flow, function () {
        //         const n2 = helper.getNode("n2");
        //         const n1 = helper.getNode("n1");
        //         n1.receive({ payload: inMessage });
        //         n2.warn.should.be.calledWithExactly('lolwtf');
        //         n1.should.have.property('state', 'off');
        //         done();
        //     });
        // });
        it((typeof inMessage) + ' message "' + inMessage + '" while on should change state', function (done) {
            const flow = [
                { id: "n1", type: "staircase-timer", name: "test name", timeout: "1" }
            ];
            helper.load(timerNode, flow, function () {
                const n1 = helper.getNode("n1");
                n1.receive({ payload: "start" });
                n1.receive({ payload: inMessage });
                n1.should.have.property('state', 'off');
                done();
            });
        });
        it((typeof inMessage) + ' message "'+ inMessage + '" while on should send off message', function (done) {
            const flow = [
                { id: "n1", type: "staircase-timer", name: "test name", timeout: "1", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];
            helper.load(timerNode, flow, function () {
                const n2 = helper.getNode("n2");
                const n1 = helper.getNode("n1");
                n1.receive({ payload: "start" });
                n2.on("input", function (msg) {
                    msg.should.have.property('payload', 'off');
                    done();
                });
                n1.receive({ payload: inMessage });
            });
        });
        it((typeof inMessage) + ' message "'+ inMessage + '" while on should send custom message', function (done) {
            const flow = [
                { id: "n1", type: "staircase-timer", offPayload: "ausgeschaltet", name: "test name", timeout: "2", wires: [["n2"]] },
                { id: "n2", type: "helper" }
            ];
            helper.load(timerNode, flow, function () {
                const n2 = helper.getNode("n2");
                const n1 = helper.getNode("n1");
                n1.receive({ payload: "start" });
                n2.on("input", function (msg) {
                    msg.should.have.property('payload', 'ausgeschaltet');
                    done();
                });
                n1.receive({ payload: inMessage });
            });
        });
    }
});