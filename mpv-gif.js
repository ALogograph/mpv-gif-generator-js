/*
Original by Ruin0x11
Ported to Windows by Scheliux, Dragoner7
Ported to Javascript by Lee Xavier

Create animated GIFs with mpv
Requires ffmpeg.
Adapted from http://blog.pkh.me/p/21-high-quality-gif-with-ffmpeg.html
Usage: "g" to set start frame, "G" to set end frame, "Ctrl+g" to create.
*/

String.prototype.format = function () {
    var a = this;
    for (var k in arguments) {
        a = a.replace(new RegExp("\\{" + k + "\\}", 'g'), arguments[k]);
    }
    return a
}

var options = {
    dir : "C:/Program Files/mpv/gifs",
    rez : 600,
    fps : 15,
};

var temp = mp.utils.getenv("TEMP");
mp.msg.info(temp);
mp.options.read_options(options, "gif");

var fps = options.fps && options.fps >= 1 && options.fps <= 30 
    ? options.fps
    : 15;

var outputDirectory = options.dir;

var startTime = -1;
var endTime = -1;

var palette = "{0}\\{1}".format(temp, "palette.png"); 
var filters = "fps=" + fps + ",scale=" + options.rez + ":-1:flags=lanczos";
function makeGifInternal(burnSubtitles) {

    if (startTime > endTime || startTime == -1 || endTime == -1) {
        mp.osd_message("Invalid start or end time.");
        return;
    }
    var position = startTime;
    var duration = endTime - startTime;
    mp.osd_message("Starting gif creation...");

    var esc = function (str) {
        return str.replace('""', '"\\""');
        return str.replace("\\", "/")
    }

    var escForSub = function (str) {
        str = str.replace("\\", "/");
        str = str.replace(":", "\\\\:");
        return str;
    }

    var fileExists = function (str) {
        try {
            mp.utils.read_file(str);
            return true;
        } catch (e) {
            return false;
        }
    }

    var pathName = mp.get_property("path", "");
    var trimFilters = esc(filters);

    // Let's start by creating the palette
    var paletteArgs = [
        "ffmpeg", 
        '-v', 
        'warning', 
        '-ss',
        position.toString(),
        '-t',
        duration.toString(),
        '-i',
        esc(pathName),
        '-vf',
        (esc(trimFilters) + ",palettegen"),
        "-y",
        esc(palette)
    ];
    mp.command_native({
        name : "subprocess",
        args : paletteArgs,
        capture_stdout: true
    });
    mp.msg.info(paletteArgs.join(' '));
    
    //Now, on to gif creation

    //Determine the filename
    var num = 0;
    var fileName = mp.get_property("filename/no-ext");
    var gifName;
    do {
        var gifPath = "{0}{1}".format(outputDirectory, fileName);
        var testName = "{0}_{1}.gif".format(gifPath, num);
        if (!fileExists(testName)) {
            gifName = testName;
            break;
        } else {
            num++
        }
    } while (true);

    mp.msg.info(gifName);
    
    var gifArgs = [
        'ffmpeg', 
        '-v', 
        'warning', 
        '-ss', 
        position.toString(), 
        '-t', 
        duration.toString(), 
        '-i', 
        pathName, 
        '-i', 
        palette, 
        "-lavfi", 
        (trimFilters + "[x]; [x][1:v] paletteuse"), 
        '-y', 
        gifName
    ]
    mp.command_native({
        name : "subprocess",
        args : gifArgs,
        capture_stdout: true
    });
    mp.msg.info(gifArgs.join(' '));
    mp.osd_message("Gif successfully created");
}

function setStartOfGif() {
    startTime = mp.get_property_number("time-pos", -1);
    mp.osd_message("Start of GIF set at " + startTime);
}

function setEndOfGif() {
    endTime = mp.get_property_number("time-pos", -1)
    mp.osd_message("End of GIF set at " + endTime)
}

function makeGifWithoutSubtitles() {
    makeGifInternal(false)
}

function makeGifWithSubtitles() {
    makeGifInternal(true)
}

mp.add_key_binding("y", "set_gif_start2", setStartOfGif)
mp.add_key_binding("Y", "set_gif_end2", setEndOfGif)
mp.add_key_binding("Ctrl+y", "make_gif2", makeGifWithoutSubtitles)
mp.add_key_binding("Ctrl+Y", "make_gif_with_subtitles2", makeGifWithSubtitles)

