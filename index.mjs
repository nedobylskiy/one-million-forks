import express from 'express';
import * as fs from "node:fs";

import fetch from "node-fetch";

//Exec async
import {exec} from "node:child_process";
//Promisify exec
import {promisify} from "node:util";

const execAsync = promisify(exec);

const app = express();
const PORT = 1337;

app.use(express.json());

let webhooks = [];

app.post('/webhook', async (req, res) => {

    console.log('Received webhook');

    webhooks.push({
        callback: async () => {
            //  console.log('Get hook:', req.body);

            let hook = req.body;

            if (!hook.forkee) {
                //  console.log('No hook.forkee');
                return res.status(200).send('No forkee');
            }


            let forker = {
                profileUrl: hook.forkee.owner.html_url,
                avatarUrl: hook.forkee.owner.avatar_url,
                username: hook.forkee.owner.login,
                name: '',
                bio: ''
            };

            console.log('New forker:', forker.username);

            //Enrich with bio and name from api
            let request = await fetch(hook.forkee.owner.url);
            if (request.ok) {
                let data = await request.json();
                if (data.name) {
                    forker.name = data.name;
                }
                if (data.bio) {
                    forker.bio = data.bio;
                }
            }


            let readme = fs.readFileSync('README.md', 'utf8');

            let forkersTenList = readme.split('## Our last 10 forkers:')[1].split('##')[0].trim().split('\n').filter(line => line.trim() !== '');

            //Add new forker to the start of the list
            if (forker.name) {
                forkersTenList.unshift(`- <a href="${forker.profileUrl}"><img src="${forker.avatarUrl}" alt="${forker.username}" width="64" height="64" style="vertical-align:middle; border-radius:50%;"> ${forker.name} (@${forker.username})</a> ${forker.bio ? `- *${forker.bio}*` : ''}`);
            } else {
                forkersTenList.unshift(`- <a href="${forker.profileUrl}"><img src="${forker.avatarUrl}" alt="${forker.username}" width="64" height="64" style="vertical-align:middle; border-radius:50%;"> ${forker.username}</a> ${forker.bio ? `- *${forker.bio}*` : ''}`);
            }

            //Keep only the last 10 forkers
            forkersTenList = forkersTenList.slice(0, 10);

            console.log(readme,'\n-------------------');
            //Rebuild the readme
            let newReadme = readme.split('## Our last 10 forkers:')[0] + '## Our last 10 forkers:\n\n' + forkersTenList.join('\n') + '\n\n##' + readme.split('## Our last 10 forkers:')[1].split('##')[1] + '##' + readme.split('## Our last 10 forkers:')[1].split('##').slice(2).join('##');
            console.log(newReadme,'\n-------------------');
            let forksCount = newReadme.match(/## FORKS COUNT: (\d+)/);
            if (forksCount && forksCount[1]) {
                forksCount = parseInt(forksCount[1]) + 1;
            }


            console.log(newReadme);
            if (Number(forksCount) === 100 || Number(forksCount) === 500 || Number(forksCount) === 1000 || Number(forksCount) === 5000 || Number(forksCount) === 10000 || Number(forksCount) === 50000 || Number(forksCount) === 100000 || Number(forksCount) === 500000 || Number(forksCount) === 1000000) {
                console.log(`Milestone reached: ${forksCount} forks! Adding to README.md`);
                //Add this profile to ## Milestones section
                newReadme = newReadme.replace('## Milestones', `## Milestones\n\n- 🎉 Reached ${forksCount} forks with a fork from [${forker.name ? forker.name : forker.username}](${forker.profileUrl}) (@${forker.username})\n`);
            }

            //Replace forks count "## FORKS COUNT: 0"
            newReadme = newReadme.replace(/## FORKS COUNT: \d+/g, `## FORKS COUNT: ${forksCount}`);


            fs.writeFileSync('README.md', newReadme);

            //Make folder for forker
            let folderName = `forkers/${forker.username}`;
            if (!fs.existsSync(folderName)) {
                fs.mkdirSync(folderName, {recursive: true});
            }

            fs.writeFileSync(`${folderName}/README.md`, `# ${forker.name ? forker.name : forker.username} (@${forker.username})\n\n- Profile: [${forker.profileUrl}](${forker.profileUrl})\n- Avatar: ![Avatar](${forker.avatarUrl})\n${forker.bio ? `- Bio: ${forker.bio}\n` : ''}`);

            console.log('Updated README.md and created folder for forker');

            //Commit changes
            await execAsync('git add README.md && git add forkers && git commit -m "Add new forker" && git push');

            console.log('Pushed changes to GitHub');

            res.status(200).send('OK');
        }
    });


});

//Synchronous processing of webhooks every second
setInterval(async () => {
    //console.log('Webhooks in queue:', webhooks.length);
    if (webhooks.length > 0) {
        let hook = webhooks.shift();
        try {
            await hook.callback();
        } catch (e) {
            console.error('Error processing webhook:', e);
        }
    }
}, 500);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Running on http://localhost:${PORT}`);
});
