import { serialize } from 'cookie';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
	try{
		const body = await request.json();
		const { token } = body;

		if (!token) {
			return NextResponse.json({ message: 'Token is required'},{ status: 400});
		}
		const serializedCookie = serialize('auth_token', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV !== 'development',
			sameSite: 'strict',
			maxAge: 60 * 60 * 24,
			path: '/',
		});
		return NextResponse.json(
			{message: 'Authentication successful' },
			{
				status: 200,
				headers: { 'set-Cookie': serializedCookie },
			}
		);
	} catch(error){
		return NextResponse.json({message: 'An error occurred'}, { status: 500 });
	}
}