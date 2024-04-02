const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const axios = require('axios'); // You'll need axios to handle HTTP requests

const TOKEN = ' '; // Replace with your bot's token
const BANNED_WORDS_FILE = 'bannedWords.json';

const client = new Client({
  intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, // Required to read message content
      GatewayIntentBits.GuildMembers    // If you need to access member information
  ]
});

let bannedWords = [];
// Function to load banned words from the file
function loadBannedWords() {
  fs.readFile(BANNED_WORDS_FILE, (err, data) => {
    if (err) throw err;
    bannedWords = JSON.parse(data).words;
  });
  console.log('loaded bad words')
}

//client on

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  loadBannedWords();
});


//Get list of banned words

client.on('messageCreate', async message => {
  console.log('READING CHAT')
  if (message.content.startsWith('!listbannedwords')) {
    console.log('command - Listbannedwords read')
    if (message.member.roles.cache.some(role => role.name === 'Mod')) {
        message.reply(bannedWords.join(', '))
    } else {
      message.reply('You do not have permission to use this command.');
    }
  }
})

//Add new words to filter

client.on('messageCreate', async message => {
    // Add a new banned word
    if (message.content.startsWith('!addbannedword')) {
      if (message.member.roles.cache.some(role => role.name === 'Mod')) {
        const newWord = message.content.split(' ')[1]?.toLowerCase(); // Convert to lowercase
        if (newWord) {
          bannedWords.push(newWord);
          fs.writeFile(BANNED_WORDS_FILE, JSON.stringify({ words: bannedWords }), err => {
            if (err) throw err;
            message.reply(`Added "${newWord}" to banned words.`);
          });
        } else {
          message.reply('Please specify a word to ban.');
        }
      }
    }
  });
  
// Content Filter
      
client.on('messageCreate', message => {
    if (message.author.bot) return;
    // Declare and initialize foundWordInContent
    let foundWordInContent = false;
    let foundWordInEmbed = false;
  
    const messageContentLower = message.content.toLowerCase();
    // Check for banned words in message content
    if (bannedWords.some(word => messageContentLower.includes(word))) {
      foundWordInContent = true;
    }
  
      // Check if the message has embeds  
      if (message.embeds.length > 0) {
        console.log("Embeds are present in the message");

        message.embeds.forEach(embed => {
            const embedTitle = embed.title ? embed.title.toLowerCase() : '';
            const embedDescription = embed.description ? embed.description.toLowerCase() : '';
            const embedContent = embedTitle + embedDescription; // No need to check fields as they are not user-generated

            if (bannedWords.some(word => embedContent.includes(word))) {
                console.log("Banned word found in embed");
                foundWordInEmbed = true;
            }
        });
    }

    // Check if a banned word was found in content or embed
    if (foundWordInContent || foundWordInEmbed) {
      message.delete()
        .then(() => {
          message.channel.send(`A message was deleted because it contained a banned word.`);
        })
        .catch(err => {
          console.error('Error while deleting message:', err);
        });
    }

  // Delete links from new accounts, except in the "Community-content" channel
  else {
    if (message.channel.name !== 'Community-content') {
      const accountAge = new Date() - message.author.createdAt;
      const oneWeek = 1000 * 60 * 60 * 24 * 7;
        if (accountAge < oneWeek && message.content.includes('http') && 
          !message.content.includes('Tenor') && !message.content.endsWith('.gif')) {
        message.delete();
        message.reply('New accounts cannot post links.');
      }
    }
  }
});

//file ingest to bulk add words to bannedwords list

client.on('messageCreate', async message => {
  if (message.content.startsWith('!importfile')) {
    console.log('command - importfile read')
    const attachments = message.attachments;
    console.log('command - importfile - Attachmentfound')
    if (attachments.size > 0) {
      const file = attachments.first();

      // Check if the file is a .txt file
      if (file.name.endsWith('.txt')) {
        console.log('command - importfile - confirmed txt file')
        try {
          const response = await axios.get(file.url);
          const words = response.data.split(/,|\n/).map(word => word.trim().toLowerCase()); // Convert each word to lowercase
          console.log('command - importfile - words split', words);
        
          if (message.member.roles.cache.some(role => role.name === 'Mod')) {
            // Assuming you want to add all the new words to the bannedWords array
            words.forEach(newWord => {
              if (newWord && !bannedWords.includes(newWord)) { // Check if the word is not empty and not already in the list
                bannedWords.push(newWord);
              }
            });
        
            // Write the updated list to the file
            fs.writeFile(BANNED_WORDS_FILE, JSON.stringify({ words: bannedWords }), err => {
              if (err) throw err;
              message.reply(`Added new words to banned words.`);
            });
          } else {
            message.reply('You do not have permission to use this command.');
          }
        } catch (error) {
          console.error('Error reading file:', error);
        }
      } else {
        message.reply('Please upload a .txt file.');
      }
    } else {
      message.reply('Please attach a file with the command.');
    }
  }

  // ... Other command handling ...
});

//remove banned words

client.on('messageCreate', async message => {
  if (message.content.startsWith('!removebannedword')) {
    if (message.member.roles.cache.some(role => role.name === 'Mod')) {
      const wordToRemove = message.content.split(' ')[1]?.toLowerCase(); // Get the word to remove and convert to lowercase

      if (wordToRemove) {
        // Check if the word exists in the bannedWords array
        const index = bannedWords.indexOf(wordToRemove);
        if (index > -1) {
          bannedWords.splice(index, 1); // Remove the word from the array

          // Update the JSON file
          fs.writeFile(BANNED_WORDS_FILE, JSON.stringify({ words: bannedWords }), err => {
            if (err) {
              console.error('Error writing to file:', err);
              message.reply('Failed to remove the word due to an error.');
            } else {
              message.channel.send(`Removed "${wordToRemove}" from banned words.`);
            }
          });
        } else {
          message.reply('That word is not in the banned words list.');
        }
      } else {
        message.reply('Please specify a word to remove.');
      }
    } else {
      message.reply('You do not have permission to use this command.');
    }
  }

  // ... Other command handling ...
});

client.login(TOKEN);