settings = {
    "streamerId": "####", // streamerId is the numeric `id` from `/streamers/<streamer-name` endpoint, but needs to be cast as a string for the socket event
    "chaptersOutputFolder": "", // Folder to save the exported chapters file. Leave empty to use root directory of stamper project
    "chaptersOutputFileName": "chapters.txt", // Name of destination export file
    "db_user": "username", // Database username
    "db_pwd": "password", // Database password
    "db_cluster_path": "your-cluster.5om35tr1ng.mongodb.net/test?retryWrites=true&w=majority" // Database cluster path
}

export default settings;