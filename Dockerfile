FROM nodered/node-red:1.2.6

RUN mkdir -p /tmp/staircase-timer && cd /usr/src/node-red && npm install node-red-dashboard
COPY * /tmp/staircase-timer
RUN cd /usr/src/node-red && npm install /tmp/staircase-timer && npm install node-red-dashboard