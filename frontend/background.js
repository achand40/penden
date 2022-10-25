//Only forwards the messages it recieved to communicate between content and popup

chrome.runtime.onMessage.addListener(function (message, sender) {
    chrome.tabs.sendMessage(sender.tab.id, message);
});


const keyStrokeListener = (command, tabs) => {
    if (command === "generate-load-for-index") {
        let msg = {
            command: "show-popup"
        };
        chrome.tabs.sendMessage(tabs.id, msg);
    }
    else if (command === "alt-text") {
        let msg = {
            command: "alt-text"
        };
        chrome.tabs.sendMessage(tabs.id, msg);
    }
}

chrome.commands.onCommand.addListener(keyStrokeListener);

