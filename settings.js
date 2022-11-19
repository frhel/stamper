const settings = {
    "streamerId": "7325", // streamerId is the numeric `id` from `/streamers/<streamer-name` endpoint, but needs to be cast as a string for the socket event
    "temp_vod_folder": "E:\\VODs\\Temp\\", // Folder where the temporary VOD files are stored
    "chaptersOutputFolder": "", // Folder to save the exported chapters file. Leave empty to use root directory of stamper project
    "chaptersOutputFileName": "chapters.txt", // Name of destination export file
    "db_user": "master_stamper", // Database username
    "db_pwd": "YzXFxhLOT5LlTI0c", // Database password
    "db_name": "test", // Database name
    "db_cluster_path": "stamper-v1.8ous7xv.mongodb.net/", // Database cluster path
    "db_connection_params": "?retryWrites=true&w=majority" // Database connection parameters
}

export { settings };