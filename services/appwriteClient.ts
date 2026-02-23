import { Client, Account, Databases, ID, Query } from 'appwrite';

const client = new Client()
    .setEndpoint((import.meta as any).env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject((import.meta as any).env.VITE_APPWRITE_PROJECT_ID || '699a5d330017f77f9b8b');

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases, ID, Query };
