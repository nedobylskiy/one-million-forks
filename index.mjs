import express from 'express';
import * as fs from "node:fs";

const app = express();
const PORT = 1337;

app.use(express.json());

app.post('/webhook', async (req, res) => {
    console.log('Get hook:', req.body);

    let hook = req.body;

    if (!hook.forkee) {
        console.log('No hook.forkee');
        return res.status(400).send('Bad Request: Missing hook.forkee');
    }


    let forker = {
        profileUrl: hook.forkee.owner.html_url,
        avatarUrl: hook.forkee.owner.avatar_url,
        username: hook.forkee.owner.login,
        name: '',
        bio: ''
    };

    let forksCount = hook.forkee.forks_count;

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

    //Rebuild the readme
    let newReadme = readme.split('## Our last 10 forkers:')[0] + '## Our last 10 forkers:\n\n' + forkersTenList.join('\n') + '\n\n##' + readme.split('## Our last 10 forkers:')[1].split('##')[1];

    //Replace forks count "## FORKS COUNT: 0"
    newReadme = newReadme.replace(/## FORKS COUNT: \d+/g, `## FORKS COUNT: ${forksCount}`);

    fs.writeFileSync('README.md', newReadme);

    //Make folder for forker
    let folderName = `forkers/${forker.username}`;
    if (!fs.existsSync(folderName)) {
        fs.mkdirSync(folderName, {recursive: true});
    }

    fs.writeFileSync(`${folderName}/README.md`, `# ${forker.name ? forker.name : forker.username} (@${forker.username})\n\n- Profile: [${forker.profileUrl}](${forker.profileUrl})\n- Avatar: ![Avatar](${forker.avatarUrl})\n${forker.bio ? `- Bio: ${forker.bio}\n` : ''}`);

    res.status(200).send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Running on http://localhost:${PORT}`);
});
