module.exports = {
    apps: [{
        name: "uptime-kuma",
        script: "./server/server.js",
        instances: 0,
        exec_mode: "cluster",
        watch: ".",
    }]
};