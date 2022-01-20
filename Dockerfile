FROM nodered/node-red

RUN mkdir -p /tmp/staircase-timer && cd /usr/src/node-red && npm install node-red-dashboard
COPY * /tmp/staircase-timer
RUN cd /usr/src/node-red && npm install /tmp/staircase-timer && npm install node-red-dashboard