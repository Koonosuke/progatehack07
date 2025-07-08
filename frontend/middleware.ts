import { createRemoteJWKSet, jwtVerify } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';

const cognitoRegion = process.env.NEXT_PUBLIC_COGNITO_REGION!;
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!;
const cliendId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;

const jwksUri = `https://cognito-idp.${cognitoRegion}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
const JWKS = createRemoteJWKSet(new URL(jwksUri));

export async function middleware(request: NextRequest){
	const token = request.cookies.get('auth_token')?.value;
	if(!token){
		return NextResponse.redirect(new URL('/auth/login', request.url));
	}
	try{
		await jwtVerify(token, JWKS, {
			issuer: `https://cognito-idp${cognitoRegion}.amazonaws.com/${userPoolId}.`,
			audience: cliendId,
		});
		return NextResponse.next();
	} catch(error){
		console.error("JWT Verification Error: ", error);
		return NextResponse.redirect(new URL('/auth/login', request.url));
	}
}

export const config = {
	matcher:[
		'/((?!api|_next/static|_next/image|favicon.ico|auth/login).*)',
	],
};