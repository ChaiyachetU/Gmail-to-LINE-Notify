// google drive attachments folder id
const attachmentFolderId = "Your Google Drive Attachments folder ID";

// line notify access token
const lineNotifyToken = "Your LINE Notify Access Token";

// bitly token
const bitlyToken = "Your Bitly Token";

// priority contact list emails
const priorityContactListEmails = [
  // test
  "Your Priority Email-1", "Your Priority Email-2"
];

function main() {
  // get unread emails from priority contact list
  const priorityUnreadEmails = getPriorityUnreadEmails();

  // if priority unread emails is not empty send emails message to line notify
  if (priorityUnreadEmails.length !== 0) {
    priorityUnreadEmails.forEach(unreadEmail => sendMessageToLineNotify(unreadEmail, lineNotifyToken));
  }
}

// get priority unread emails
function getPriorityUnreadEmails() {
  let priorityUnreadEmails = [];

  // priority inbox unread emails
  const priorityInboxUnread = GmailApp.getPriorityInboxUnreadCount();
  Logger.log("Priority inbox unread : " + priorityInboxUnread);

  // new priority inbox emails
  if (priorityInboxUnread) {
    // retrieves all priority inbox unread threads
    const allPriorityInboxUnreadThreads = GmailApp.getPriorityInboxThreads(0, priorityInboxUnread);

    allPriorityInboxUnreadThreads.forEach((priorityInboxUnreadThread) => {
      let unreadEmailMessage = "";

      // gets the messages in priotiry inbox unread thread
      const messages = priorityInboxUnreadThread.getMessages();

      messages.forEach((message) => {

        // gets the sender of this message
        const sender = extractEmails(message.getFrom());

        // check sender is priority contact list
        const isPriorityContact = priorityContactListEmails.includes(sender);

        // new inbox is my contact list emails and unread
        if (isPriorityContact && message.isUnread) {
          // sender
          Logger.log("New Inbox Email From My Contact List : " + sender);
          unreadEmailMessage += "\n\n📥New email from : " + sender;

          // email subject
          const emailSubject = message.getSubject();
          Logger.log("Email Subject :" + emailSubject);
          unreadEmailMessage += "\n\n🏷️Subject : " + emailSubject;

          // email contents with replaces all 3 types of line breaks with single line break (\n) and more white space with single white space
          const emailContents = message.getPlainBody().replace(/(\r\n|\n|\r)+/g, "\n").replace(/( )+/g," ");
          Logger.log("Email Content :" + emailContents);

          if (emailContents.length < 300) {
            unreadEmailMessage += "\n\n📋Contents : " + emailContents;
          } else {
            unreadEmailMessage += "\n\n📋Contents : " + emailContents.slice(0, 300) + "...";
          }

          // email attatchments
          const attatchments = message.getAttachments();
          if (attatchments.length !== 0) {
            // get attachment file url for download
            const attachmentFileUrls = saveAttachmentFiles(attatchments, attachmentFolderId);

            attachmentFileUrls.forEach(fileUrl => unreadEmailMessage += "\n\n🔗Attachment File : " + fileUrl);
          }

          // marks the message as read
          message.markRead();

          // stars the message
          message.star();

          // reloads this message and associated state from Gmail
          message.refresh();

          // reply to sender
          message.reply("Got your message, Thank you.✌️\n\n" + "Chaiyachet ✌️\n\n" + "This email is auto-generated. Please do not reply.");
        }

        // add messages for send to line notify
        if (unreadEmailMessage !== "") {
          priorityUnreadEmails.push(unreadEmailMessage);
        }
      })
    })
  } else {
    Logger.log("📥 No new priority inbox unread ✌️");
  }

  return priorityUnreadEmails;
}

// save attachment files to date folder
function saveAttachmentFiles(attatchments, folderId) {
  let attatchmentUrls = [];

  // gets the folder with the given ID
  const attachmentsFolder = DriveApp.getFolderById(folderId);

  // set folder name with date
  const today = new Date().getFullYear() + "-" + (new Date().getMonth() + 1) + "-" + new Date().getDate();

  // get folder with today date name
  const todayFolder = attachmentsFolder.getFoldersByName(today).hasNext();

  // check folder with date name existing
  if (!todayFolder) {
    const todayFolder = attachmentsFolder.createFolder(today);

    attatchments.forEach(attachment => {
      Logger.log("Attachment Name : " + attachment.getName());

      const newAttachmentFile = todayFolder.createFile(attachment).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const newAttchmentFileUrl = newAttachmentFile.getDownloadUrl();
      const shortUrl = createShortUrl(newAttchmentFileUrl, bitlyToken);

      attatchmentUrls.push(shortUrl);
    })
  } else {
    attatchments.forEach(attachment => {
      Logger.log("Attachment Name : " + attachment.getName());

      const newAttachmentFile = attachmentsFolder.getFoldersByName(today).next().createFile(attachment).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const newAttchmentFileUrl = newAttachmentFile.getDownloadUrl();
      const shortUrl = createShortUrl(newAttchmentFileUrl, bitlyToken);

      attatchmentUrls.push(shortUrl);
    })
  }

  return attatchmentUrls;
}

// send email message to line notify
function sendMessageToLineNotify(message, accesssToken) {
  const lineNotifyEndPoint = "https://notify-api.line.me/api/notify";

  const options = {
    "method": "POST",
    "headers": {
      "Authorization": "Bearer " + accesssToken,
      "Content-Type": "	application/x-www-form-urlencoded"
    },
    "payload": {
      "message": message
    },
  };

  try {
    UrlFetchApp.fetch(lineNotifyEndPoint, options);
    Logger.log("Send Notify Completed!");
  } catch (error) {
    Logger.log(error.name + "：" + error.message);
    return;
  };
}

// get contact emails
function extractEmails(text) {
  return text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi)[0];
}

// get Bitly short link
function createShortUrl(longUrl, bitlyToken) {
  const bitlyEndPoint = "https://api-ssl.bitly.com/v4/shorten";
  
  const options = {
    "method": "POST",
    "headers": {
      "Authorization": "Bearer " + bitlyToken,
      "Content-Type": "application/json"
    },
    "payload": JSON.stringify({
      "long_url": longUrl
    }),
  };

  try {
    const shortUrl = JSON.parse(UrlFetchApp.fetch(bitlyEndPoint, options));
    Logger.log(shortUrl.link)
    return shortUrl.link;
  } catch (error) {
    Logger.log(error.name + "：" + error.message);
    return;
  };
}
