const helper = require("node-red-node-test-helper");
const timerNode = require("../staircase-timer.js");

describe('staircase-timer Node', function () {

    afterEach(function () {
        helper.unload();
    });

    it('should be loaded', function (done) {
        var flow = [{ id: "n1", type: "staircase-timer", name: "test name", timeout: "5" }];
        helper.load(timerNode, flow, function () {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'test name');
            n1.should.have.property('timeout', 5);
            n1.should.have.property('onPayload', '1');
            n1.should.have.property('offPayload', '1');
            n1.should.have.property('renewable', '');
            done();
        });
    });

    it('should initially be off', function (done) {
        var flow = [{ id: "n1", type: "staircase-timer", name: "test name", timeout: "5" }];
        helper.load(timerNode, flow, function () {
            var n1 = helper.getNode("n1");
            n1.should.have.property('state', 'off');
            done();
        });
    });

    it('message "on" should change state', function (done) {
        var flow = [
            { id: "n1", type: "staircase-timer", name: "test name", timeout: "2" }
        ];
        helper.load(lowerNode, flow, function () {
            var n1 = helper.getNode("n1");
            n1.receive({ payload: "on" });
            n1.should.have.property('state', 'on');
            done();
        });
    });

    it('message "on" should send on message', function (done) {
        var flow = [
            { id: "n1", type: "staircase-timer", name: "test name", timeout: "2", wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];
        helper.load(lowerNode, flow, function () {
            var n2 = helper.getNode("n2");
            var n1 = helper.getNode("n1");
            n2.on("input", function (msg) {
                msg.should.have.property('payload', 'on');
                done();
            });
            n1.receive({ payload: "on" });
        });
    });
});