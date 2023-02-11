const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express()

app.use(cors())
app.use(express.json())

const port = process.env.PORT || 5000

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.ipnjwkc.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


app.get('/', (request, response) => {
    console.log(token)
    response.send('API Testing Server Online')
})

async function run() {
    try{
        const usersCollection = client.db('dumSoc').collection('users')
        const postsCollection = client.db('dumSoc').collection('posts')
        const commentsCollection = client.db('dumSoc').collection('comments')

        app.post('/register', async(request, response) => {
            const user = request.body
            const sameEmailUser = await usersCollection.findOne({email: user.email})
            const sameUserName = await usersCollection.findOne({username: user.username})

            if(sameEmailUser?.email === user.email){
                response.status(400).send({message: "Email Already Exists"})
            }

            else if(sameUserName?.username === user.username){
                response.status(400).send({message: "Username Already Exists"})
            }

            else {
                const result = await usersCollection.insertOne(user)
            
                if(result.acknowledged){
                    const token = jwt.sign(await usersCollection.findOne({email: user.email}), process.env.JWT_SECRET, {expiresIn: 24*60*60})
                    response.status(200).send({token})
                }
                response.status(400).send({message: "Error Creating User"})
            }
        })

        app.post('/login', async(request, response)=>{
            const user = request.body
            const userFound = user?.username?await usersCollection.findOne({username: user.username}):await usersCollection.findOne({email:user.email})
            if((userFound?.email === user?.email || userFound?.username === user?.username) && userFound?.password === user.password){
                const token = jwt.sign(userFound, process.env.JWT_SECRET, {expiresIn: 24*60*60})
                response.status(200).send({token})
            }

            else if((userFound?.email === user?.email || userFound?.username === user?.username) || userFound?.password === user.password){
                response.status(400).send({message: "Wrong email/password"})
            }

        })

        app.post('/verify-user', async(request, response) => {
            const user = await usersCollection.findOne({email: request.body.email})
            response.send(user?.email?{exists: true}:{exists:false})
        })

        app.put('/reset-pass', async(request, response) => {
            const filter = {email: request.body.email}
            const updateDoc = {
                $set:{
                    password: request.body.password
                }
            }

            const result = await usersCollection.updateOne(filter, updateDoc)
            console.log(result)
            if(result.modifiedCount){
                const token = jwt.sign(await usersCollection.findOne({email: request.body.email}), process.env.JWT_SECRET, {expiresIn: 24*60*60})
                response.send({token})
            }
            else{
                response.send({message: "Error Updating password"})
            }
        })

        app.get('/posts', async(request, response) => {
            const query = {}
            const posts = await postsCollection.find(query).toArray()
            response.send(posts)
        })

        app.post('/post', async(request, response) => {
            const post = request.body
            const result = await postsCollection.insertOne(post)
            response.send(result)
        })

        app.put('/posts/:id', async(request, response) => {
            const filter = {_id: new ObjectId(request.params.id)}
            const options = {upsert: true}
            const description = request.body.description

            const updateDoc = {$set: {
                description: description
            }}

            const result = await postsCollection.updateOne(filter, updateDoc, options)
            response.send(result)
        })

        app.delete('/posts/:id', async(request, response) => {
            const filter = {_id: new ObjectId(request.params.id)}
            const result = await postsCollection.deleteOne(filter)
            response.send(result)
        })

        app.put('/like-post/:postId', async(request, response) => {
            const postId = request.params.postId
            const likesCount = request.body.likes
            const filter = {_id: new ObjectId(postId)}
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    likes: likesCount
                }
            }

            const result = await postsCollection.updateOne(filter, updateDoc, options)
            response.send(result)
        })

        app.post('/add-comment', async(request, response) => {
            const comment = request.body
            const result = await commentsCollection.insertOne(comment)
            response.send(result)
        })

    }
    finally {

    }
}

run().catch(console.dir);

app.listen(port, ()=>{
    console.log(`API Testing Server Running on port ${port}`)
})