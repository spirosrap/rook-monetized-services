const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function getCodeReview(code, language = 'auto') {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert code reviewer. Analyze the code thoroughly and find:
1. Bugs (logic errors, edge cases, race conditions)
2. Security vulnerabilities
3. Performance issues
4. Code quality problems
5. Best practice violations

Return a JSON object with:
- bugs: array of {severity: "high"|"medium"|"low", file, line, description, suggestion}
- suggestions: array of {category, description}
- summary: brief overview of code health (0-100 score)
- complexity: estimated cyclomatic complexity

Be specific about line numbers and provide actionable fixes.`
        },
        {
          role: 'user',
          content: `Language: ${language}\n\nCode to review:\n\`\`\`\n${code}\n\`\`\``
        }
      ],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    return {
      error: error.message,
      suggestion: 'Check your OPENAI_API_KEY environment variable'
    };
  }
}

module.exports = { getCodeReview };
