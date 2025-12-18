import 'dotenv/config';
import * as joi from 'joi';

interface EnvVariables {
    PORT: number;
    NATS_SERVERS: string;
}

const envVarsSchema = joi.object({
    PORT: joi.number().required(),
    NATS_SERVERS: joi.array().items(joi.string().uri()).required(),
})
    .unknown(true);

const { error, value } = envVarsSchema.validate({
    ...process.env,
    NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
});

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVariables = value;

export const envs = {
    port: envVars.PORT,
    natsServers: envVars.NATS_SERVERS,
};