import disposablemail_com from './disposablemail-com';
import mailtemp_uk from './mailtemp-uk';
import smailpro_com from './smailpro-com';
import tmp_mail_io from './temp-mail-io';
import tempmail_so from './tempmail-so';
import tempmail100_com from './tempmail100-com';
import tmpmailo_com from './tempmailo-com';


(async ()=>{

    await disposablemail_com().catch(error => {
        console.error('\x1b[31mError in disposablemail_com scraper:', error, '\x1b[0m');
    });
    
    await mailtemp_uk().catch(error => {
        console.error('\x1b[31mError in mailtemp_uk scraper:', error, '\x1b[0m');
    });

    await smailpro_com().catch(error => {
        console.error('\x1b[31mError in smailpro_com scraper:', error, '\x1b[0m');
    })

    await tmp_mail_io().catch(error => {
        console.error('\x1b[31mError in tmp_mail_io scraper:', error, '\x1b[0m');
    });

    await tempmail_so().catch(error => {
        console.error('\x1b[31mError in tempmail_so scraper:', error, '\x1b[0m');
    });

    await tempmail100_com().catch(error => {
        console.error('\x1b[31mError in tempmail100_com scraper:', error, '\x1b[0m');
    });

    await tmpmailo_com().catch(error => {
        console.error('\x1b[31mError in tmpmailo_com scraper:', error, '\x1b[0m');
    });
    
    console.log('All scrapers completed successfully.');

    // Exit the process after all scrapers have completed
    process.exit(0);

})()