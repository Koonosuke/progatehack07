import { NextResponse } from 'next/server';

export async function POST(request: Request){
	const OLLAMA_API_URL = process.env.OLLAMA_BASE_URL || '';

	if(!OLLAMA_API_URL){
		console.error('OLLAMA_API_URL is not configured.');
		return NextResponse.json({ error: 'OLLAMA_API_URLがサーバーに設定されていません。' }, { status:500 });
	}

	try{
		const { words } = await request.json();

		if(!words || !Array.isArray(words) || words.length === 0){
			return NextResponse.json({error: '単語リストが無効です。'}, { status: 400});
		}
		//プロンプト
		const prompt = `あなたは今一対一通話のサポーターです．対象者はろう者です．対象者がした手話から以下の単語リストを生成しました．\n\n単語リスト: ${words.join(',')}\n\n手話の特性を考慮しつつ，単語リストを参考に文脈を補ってなめらかな文章を生成してください。\n\n<Ollama>`

		//APIリクエスト送信
		const response = await fetch(OLLAMA_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body : JSON.stringify({
				model: process.env.OLLAMA_MODEL,
				prompt: prompt,
				stream: false,
			}),
		});
		if(!response.ok){
			const errorText = await response.text();
			throw new Error(`Ollama APIからのエラー: ${response.statusText}-${errorText}`);
		}

		const ollamaData = await response.json();
		return NextResponse.json({ generatedText: ollamaData.response});
	} catch (error){
		console.error('LLM API Error: ', error);
		return NextResponse.json({ error: 'サーバー内部でエラーが発生しました。'}, { status: 500});
	}
}